import {
	decideOwnerKeywordAction,
	parseNormalReply,
	planHandoffActions,
	type AutomationSettings,
	type ConversationMode,
	type MessageRole,
} from "../../domain/whatsapp-rules.ts";
import type {
	ConversationEventRow,
	ConversationEventType,
	ConversationRow,
	InsertMessageInput,
	MediaType,
	ModeChangedBy,
} from "../db-contract.ts";
import type { CleanupResult, QueuedTurnMessage } from "../redis-turn-state.ts";

export interface WhatsAppMessage {
	key: { remoteJid?: string; id?: string; fromMe?: boolean; senderPn?: string };
	pushName?: string;
	messageTimestamp?: Date | number;
	message?: {
		conversation?: string;
		extendedTextMessage?: { text?: string };
		audioMessage?: any;
		imageMessage?: any;
		[key: string]: any;
	};
}

export interface WhatsAppUpsert {
	type: string;
	messages: WhatsAppMessage[];
}

export interface HistoryMessage {
	role: MessageRole;
	content: string;
}

type MaybePromise<T> = T | Promise<T>;

type TurnState = {
	acceptDedupeMessage(
		whatsappMessageId: string,
		options: { ttlSeconds: number; value?: string | number },
	): MaybePromise<boolean>;
	enqueueTurnMessage(
		conversationId: number,
		item: QueuedTurnMessage,
		options: { ttlSeconds: number },
	): MaybePromise<void>;
	setDebounceMarker(
		conversationId: number,
		input: { fireAtMs: number; ttlMs: number },
	): MaybePromise<void>;
	getDebounceMarker(conversationId: number): MaybePromise<number | null>;
	acquireProcessingLock(
		conversationId: number,
		token: string,
		options: { ttlMs: number },
	): MaybePromise<boolean>;
	getQueuedTurnMessages(
		conversationId: number,
	): MaybePromise<QueuedTurnMessage[]>;
	setProcessingState(
		conversationId: number,
		state: { token: string; startedAt: string; messageIds: string[] },
		options: { ttlMs: number },
	): MaybePromise<void>;
	cleanupTurnState(
		conversationId: number,
		token: string,
	): MaybePromise<CleanupResult>;
};

export interface HandlerRepository {
	getOrCreateConversation(input: {
		phone: string;
		jid?: string | null;
		name?: string | null;
	}): MaybePromise<ConversationRow>;
	getConversationById(id: number): MaybePromise<ConversationRow | null>;
	insertMessageAndTouchConversation(
		input: InsertMessageInput,
	): MaybePromise<{ id: number }>;
	setMode(
		id: number,
		mode: ConversationMode,
		input: {
			reason: string;
			changedBy: ModeChangedBy;
			changedAt?: Date;
			eventType?: ConversationEventType;
			metadata?: Record<string, unknown>;
		},
	): MaybePromise<ConversationEventRow | null>;
	recordConversationEvent(input: {
		conversation_id: number;
		event_type: ConversationEventType;
		actor_role: MessageRole | "system";
		reason?: string | null;
		metadata?: Record<string, unknown>;
		created_at?: Date;
	}): MaybePromise<ConversationEventRow>;
	getSettings(): MaybePromise<Record<string, unknown>>;
}

export interface InboundHandlerDeps {
	now: () => Date;
	repo: HandlerRepository;
	turnState: TurnState;
	getRecentHistory: (conversationId: number) => Promise<HistoryMessage[]>;
	getActiveSystemPrompt: () => Promise<string>;
	callDeepSeek: (input: {
		conversationId: number;
		history: HistoryMessage[];
		systemPrompt: string;
		queuedMessages: QueuedTurnMessage[];
	}) => Promise<string>;
	sendMessage: (jid: string, text: string) => Promise<void>;
	notifyTelegramHumanNeeded: (payload: {
		conversationId: number;
		phone: string;
		jid: string;
		reason: string;
		lastMessage: string;
	}) => Promise<void>;
	generateToken: () => string;
	readMessages: (
		keys: { remoteJid: string; id: string; fromMe: boolean }[],
	) => Promise<void>;
	sendPresenceUpdate: (
		presence: "composing" | "paused" | "recording" | "available",
		jid: string,
	) => Promise<void>;
}

export interface MessageProcessResult {
	status:
		| "ignored"
		| "duplicate"
		| "owner_disabled"
		| "owner_enabled"
		| "owner_stored"
		| "human_mode_stored"
		| "ai_replied"
		| "ai_invalid_json"
		| "ai_handoff";
	conversationId?: number;
	cleanup?: CleanupResult;
}

export interface UpsertProcessResult {
	processed: number;
	results: MessageProcessResult[];
}

function isValidOneToOneNotify(
	upsert: WhatsAppUpsert,
	message: WhatsAppMessage,
): boolean {
	const jid = message.key.remoteJid;
	return (
		upsert.type === "notify" &&
		!!jid &&
		!jid.endsWith("g.us") &&
		!jid.endsWith("@broadcast") &&
		(jid.endsWith("@s.whatsapp.net") || jid.endsWith("@lid"))
	);
}

function phoneFromJid(jid: string, messageKey?: { senderPn?: string }): string {
	const raw = messageKey?.senderPn || jid;
	return raw.split("@")[0] ?? raw;
}

function detectMediaTypeAndContent(message: WhatsAppMessage): {
	mediaType: MediaType;
	content: string;
} {
	if (message.message?.conversation) {
		return { mediaType: "text", content: message.message.conversation };
	}
	if (message.message?.extendedTextMessage?.text) {
		return {
			mediaType: "text",
			content: message.message.extendedTextMessage.text,
		};
	}
	if (message.message?.audioMessage) {
		return { mediaType: "audio", content: "[Audio: Nota de voz]" };
	}
	if (message.message?.imageMessage) {
		return { mediaType: "image", content: "[Imagen]" };
	}
	return { mediaType: "unknown", content: "" };
}

function timestampFrom(message: WhatsAppMessage, fallback: Date): Date {
	const raw = message.messageTimestamp;
	if (raw instanceof Date) return raw;
	if (typeof raw === "number")
		return new Date(raw > 10_000_000_000 ? raw : raw * 1000);
	return fallback;
}

function settingsFrom(raw: Record<string, unknown>): AutomationSettings {
	return {
		botOnKeyword: String(raw.bot_on_keyword ?? "ok."),
		keywordCaseSensitive: raw.keyword_case_sensitive === true,
		followupMaxAttempts: Number(raw.followup_max_attempts ?? 2),
		followupMinHoursAfterAssistant: Number(
			raw.followup_min_hours_after_assistant ?? 12,
		),
		whatsappFreeformWindowHours: Number(
			raw.whatsapp_freeform_window_hours ?? 24,
		),
		blockOutside24hFollowups: raw.block_outside_24h_followups !== false,
	};
}

export function createInboundHandler(deps: InboundHandlerDeps) {
	async function handleMessage(
		upsert: WhatsAppUpsert,
		message: WhatsAppMessage,
	): Promise<MessageProcessResult> {
		if (!isValidOneToOneNotify(upsert, message)) return { status: "ignored" };

		const now = deps.now();
		const remoteJid = message.key.remoteJid as string;
		const whatsappMessageId = message.key.id;
		const fromMe = message.key.fromMe === true;
		if (
			whatsappMessageId &&
			!(await deps.turnState.acceptDedupeMessage(whatsappMessageId, {
				ttlSeconds: 86_400,
			}))
		) {
			return { status: "duplicate" };
		}

		const phone = phoneFromJid(remoteJid, message.key as any);
		const beforeConversation = await deps.repo.getOrCreateConversation({
			phone,
			jid: remoteJid,
			name: message.pushName ?? null,
		});
		const rawSettings = await deps.repo.getSettings();
		const settings = settingsFrom(rawSettings);
		const debounceMs = Number(rawSettings.debounce_ms ?? 30000);
		const role: MessageRole = fromMe ? "human" : "user";
		const createdAt = timestampFrom(message, now);
		const { mediaType, content: text } = detectMediaTypeAndContent(message);

		if (mediaType === "unknown" && (!text || text.trim() === "")) {
			return { status: "ignored" };
		}

		if (mediaType === "audio" || mediaType === "image") {
			console.log(
				`[bot] Descargando y procesando archivo adjunto de tipo: ${mediaType}`,
			);
		}

		const token = deps.generateToken();
		let currentResult: MessageProcessResult | undefined;
		const done = (result: MessageProcessResult): MessageProcessResult => {
			currentResult = result;
			return result;
		};

		try {
			const inboundMessage = await deps.repo.insertMessageAndTouchConversation({
				conversation_id: beforeConversation.id,
				whatsapp_message_id: whatsappMessageId ?? null,
				direction: fromMe ? "outbound" : "inbound",
				role,
				content: text,
				media_type: mediaType,
				source: "whatsapp",
				from_me: fromMe,
				raw_timestamp: createdAt,
				created_at: createdAt,
			});

			if (role === "human") {
				const action = decideOwnerKeywordAction({ text, fromMe, settings });
				if (action === "enable_bot") {
					await deps.repo.setMode(beforeConversation.id, "AI", {
						reason: "owner_keyword_on",
						changedBy: "owner",
						changedAt: now,
						eventType: "bot_enabled",
					});
					return done({
						status: "owner_enabled",
						conversationId: beforeConversation.id,
					});
				}

				await deps.repo.setMode(beforeConversation.id, "HUMAN", {
					reason: "owner_intervention_whatsapp",
					changedBy: "owner",
					changedAt: now,
					eventType: "bot_disabled",
					metadata: { content: text },
				});
				return done({
					status:
						beforeConversation.mode === "AI"
							? "owner_disabled"
							: "owner_stored",
					conversationId: beforeConversation.id,
				});
			}

			const fresh = await deps.repo.getConversationById(beforeConversation.id);
			if (!fresh || fresh.mode !== "AI")
				return done({
					status: "human_mode_stored",
					conversationId: beforeConversation.id,
				});

			const queueItem: QueuedTurnMessage = {
				messageId: whatsappMessageId ?? `db-${inboundMessage.id}`,
				dbMessageId: inboundMessage.id,
				text,
				mediaType: mediaType,
				createdAt: createdAt.toISOString(),
			};
			await deps.turnState.enqueueTurnMessage(
				beforeConversation.id,
				queueItem,
				{
					ttlSeconds: 300,
				},
			);
			await deps.turnState.setDebounceMarker(beforeConversation.id, {
				fireAtMs: now.getTime() + debounceMs,
				ttlMs: 72_000,
			});

			// Esperamos la ventana de debounceMs antes de intentar procesar
			await new Promise((resolve) => setTimeout(resolve, debounceMs));

			// Verificamos si somos la última ejecución (sliding window debounce)
			const activeMarker = await deps.turnState.getDebounceMarker(
				beforeConversation.id,
			);
			if (activeMarker && now.getTime() + 500 < activeMarker) {
				// Si el marcador activo de Redis es posterior a nuestro despertar (con margen de gracia),
				// significa que llegó un mensaje más nuevo que reinició el contador.
				// Por ende, salimos silenciosamente y dejamos que el handler de ese nuevo mensaje lo procese.
				return done({
					status: "ignored",
					conversationId: beforeConversation.id,
				});
			}

			if (
				!(await deps.turnState.acquireProcessingLock(
					beforeConversation.id,
					token,
					{
						ttlMs: 90_000,
					},
				))
			) {
				return done({
					status: "human_mode_stored",
					conversationId: beforeConversation.id,
				});
			}
			const queuedMessages = await deps.turnState.getQueuedTurnMessages(
				beforeConversation.id,
			);
			if (!queuedMessages || queuedMessages.length === 0) {
				return done({
					status: "ignored",
					conversationId: beforeConversation.id,
				});
			}
			await deps.turnState.setProcessingState(
				beforeConversation.id,
				{
					token,
					startedAt: now.toISOString(),
					messageIds: queuedMessages.map((item) => item.messageId),
				},
				{ ttlMs: 95_000 },
			);

			// 1. Marcar los mensajes encolados como leídos
			const messageKeys = queuedMessages
				.filter((msg) => msg.messageId && !msg.messageId.startsWith("db-"))
				.map((msg) => ({
					remoteJid,
					id: msg.messageId,
					fromMe: false,
				}));
			if (messageKeys.length > 0) {
				await deps.readMessages(messageKeys).catch(() => {});
			}

			// 2. Mostrar estado "escribiendo" (composing)
			await deps.sendPresenceUpdate("composing", remoteJid).catch(() => {});

			const history = await deps.getRecentHistory(beforeConversation.id);
			const systemPrompt = await deps.getActiveSystemPrompt();

			const mappedHistory = history.map((msg) => {
				if (msg.content === "[Audio: Nota de voz]") {
					return {
						...msg,
						content:
							"[Audio: Nota de voz] (Nota de sistema: El usuario te envió una nota de voz/audio. Respondé de forma amable explicándole que por el momento no podés escuchar audios, y pedile por favor que te escriba su consulta por texto para que lo puedas ayudar.)",
					};
				}
				if (msg.content === "[Imagen]") {
					return {
						...msg,
						content:
							"[Imagen] (Nota de sistema: El usuario te envió una imagen. Respondé de forma amable explicándole que por el momento no podés ver imágenes, y pedile por favor que te la describa por texto para que lo puedas ayudar.)",
					};
				}
				return msg;
			});

			const mappedQueuedMessages = queuedMessages.map((msg) => {
				if (msg.mediaType === "audio" || msg.text === "[Audio: Nota de voz]") {
					return {
						...msg,
						text: "[Audio: Nota de voz] (Nota de sistema: El usuario te envió una nota de voz/audio. Respondé de forma amable explicándole que por el momento no podés escuchar audios, y pedile por favor que te escriba su consulta por texto para que lo puedas ayudar.)",
					};
				}
				if (msg.mediaType === "image" || msg.text === "[Imagen]") {
					return {
						...msg,
						text: "[Imagen] (Nota de sistema: El usuario te envió una imagen. Respondé de forma amable explicándole que por el momento no podés ver imágenes, y pedile por favor que te la describa por texto para que lo puedas ayudar.)",
					};
				}
				return msg;
			});

			const rawReply = await deps.callDeepSeek({
				conversationId: beforeConversation.id,
				history: mappedHistory,
				systemPrompt,
				queuedMessages: mappedQueuedMessages,
			});
			const parsed = parseNormalReply(rawReply);
			if (!parsed.ok) {
				await deps.repo.recordConversationEvent({
					conversation_id: beforeConversation.id,
					event_type: "deepseek_json_invalid",
					actor_role: "assistant",
					reason: parsed.reason,
					created_at: now,
				});
				// Detener estado escribiendo si falló
				await deps.sendPresenceUpdate("paused", remoteJid).catch(() => {});
				return done({
					status: "ai_invalid_json",
					conversationId: beforeConversation.id,
				});
			}

			for (const part of parsed.parts) {
				await deps.sendMessage(remoteJid, part);
				await deps.repo.insertMessageAndTouchConversation({
					conversation_id: beforeConversation.id,
					direction: "outbound",
					role: "assistant",
					content: part,
					media_type: "text",
					source: "bot",
					from_me: false,
					created_at: now,
				});
			}

			// 3. Detener estado "escribiendo" (paused)
			await deps.sendPresenceUpdate("paused", remoteJid).catch(() => {});

			const handoff = planHandoffActions(parsed.handoff);
			if (handoff) {
				await deps.repo.setMode(beforeConversation.id, handoff.mode, {
					reason: handoff.reason,
					changedBy: "assistant",
					changedAt: now,
					eventType: handoff.eventType,
					metadata: { notifyTelegram: true },
				});
				await deps.notifyTelegramHumanNeeded({
					conversationId: beforeConversation.id,
					phone,
					jid: remoteJid,
					reason: handoff.reason,
					lastMessage: text,
				});
				return done({
					status: "ai_handoff",
					conversationId: beforeConversation.id,
				});
			}

			return done({
				status: "ai_replied",
				conversationId: beforeConversation.id,
			});
		} finally {
			if (currentResult)
				currentResult.cleanup = await deps.turnState.cleanupTurnState(
					beforeConversation.id,
					token,
				);
		}
	}

	return {
		async handleUpsert(upsert: WhatsAppUpsert): Promise<UpsertProcessResult> {
			const results = await Promise.all(
				upsert.messages.map((message) => handleMessage(upsert, message)),
			);
			return {
				processed: results.filter(
					(result) =>
						result.status !== "ignored" && result.status !== "duplicate",
				).length,
				results,
			};
		},
	};
}
