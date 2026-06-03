import type {
	ConversationEventRow,
	ConversationRow,
	FollowUpQueryInput,
	InsertMessageInput,
} from "./db-contract.ts";
import type { DeepSeekHistoryMessage } from "./deepseek-client.ts";

type MaybePromise<T> = T | Promise<T>;

type TurnState = {
	hasActiveTurnState(conversationId: number): MaybePromise<boolean>;
	acquireFollowupRunnerLock(
		token: string,
		options: { ttlMs: number },
	): MaybePromise<boolean>;
	releaseFollowupRunnerLock(token: string): MaybePromise<boolean>;
	acquireFollowupConversationLock(
		conversationId: number,
		token: string,
		options: { ttlMs: number },
	): MaybePromise<boolean>;
	releaseFollowupConversationLock(
		conversationId: number,
		token: string,
	): MaybePromise<boolean>;
};
type Decision =
	| {
			ok: true;
			parsed: { ok: true; shouldSend: boolean; message: string | null };
	  }
	| { ok: false; reason: string };

type EventInput = {
	conversation_id: number;
	event_type: "followup_sent" | "followup_skipped" | "deepseek_json_invalid";
	actor_role: "assistant" | "system";
	reason?: string | null;
	metadata?: Record<string, unknown>;
	created_at?: Date;
};

export interface FollowUpSchedulerRepository {
	getSettings(): MaybePromise<Record<string, unknown>>;
	getPendingFollowUps(
		input: FollowUpQueryInput,
	): MaybePromise<ConversationRow[]>;
	getConversationById(id: number): MaybePromise<ConversationRow | null>;
	insertMessageAndTouchConversation(
		input: InsertMessageInput,
	): MaybePromise<{ id: number }>;
	updateConversation(
		id: number,
		patch: Partial<ConversationRow>,
	): MaybePromise<ConversationRow>;
	recordConversationEvent(
		input: EventInput,
	): MaybePromise<ConversationEventRow>;
	markFollowUpBlocked(
		conversationId: number,
		reason: string,
		blockedAt?: Date,
	): MaybePromise<ConversationEventRow>;
}

export interface FollowUpSchedulerDeps {
	now: () => Date;
	repo: FollowUpSchedulerRepository;
	turnState: TurnState;
	getRecentHistory: (
		conversationId: number,
	) => Promise<DeepSeekHistoryMessage[]>;
	decideFollowUp: (history: DeepSeekHistoryMessage[]) => Promise<Decision>;
	sendWhatsAppMessage: (jid: string, text: string) => Promise<void>;
	notifyFollowupBlocked: (input: {
		conversationId: number;
		phone: string;
		reason: string;
	}) => Promise<unknown>;
	generateToken: () => string;
}

export interface FollowUpRunResult {
	status: "completed" | "skipped_runner_locked";
	processed: number;
	candidates: number;
	sent: number;
	blocked24h: number;
	skippedActiveTurn: number;
	skippedConversationLocked: number;
	skippedByDecision: number;
	invalidDecisions: number;
	neverTouches: string[];
}

const n = (settings: Record<string, unknown>, key: string) =>
	Number(settings[key]);
const b = (settings: Record<string, unknown>, key: string) =>
	settings[key] === true;
const hoursBetween = (later: Date, earlier: Date) =>
	(later.getTime() - earlier.getTime()) / 3_600_000;
const outsideWindow = (
	c: ConversationRow,
	now: Date,
	hours: number,
	block: boolean,
) =>
	block &&
	(!c.last_user_message_at ||
		hoursBetween(now, c.last_user_message_at) > hours);

function result(status: FollowUpRunResult["status"]): FollowUpRunResult {
	return {
		status,
		processed: 0,
		candidates: 0,
		sent: 0,
		blocked24h: 0,
		skippedActiveTurn: 0,
		skippedConversationLocked: 0,
		skippedByDecision: 0,
		invalidDecisions: 0,
		neverTouches: ["./auth/", "baileys-session"],
	};
}

export function createFollowUpScheduler(deps: FollowUpSchedulerDeps) {
	async function processCandidate(
		candidate: ConversationRow,
		query: FollowUpQueryInput,
		run: FollowUpRunResult,
		now: Date,
	) {
		if (await deps.turnState.hasActiveTurnState(candidate.id))
			return void (run.skippedActiveTurn += 1);
		const token = deps.generateToken();
		if (
			!(await deps.turnState.acquireFollowupConversationLock(
				candidate.id,
				token,
				{
					ttlMs: 120_000,
				},
			))
		)
			return void (run.skippedConversationLocked += 1);
		try {
			const fresh = await deps.repo.getConversationById(candidate.id);
			if (!fresh || (await deps.turnState.hasActiveTurnState(candidate.id)))
				return void (run.skippedActiveTurn += 1);
			if (
				outsideWindow(
					fresh,
					now,
					query.freeformWindowHours,
					query.blockOutside24h,
				)
			) {
				const reason = "outside_24h_window";
				await deps.repo.markFollowUpBlocked(fresh.id, reason, now);
				await deps.notifyFollowupBlocked({
					conversationId: fresh.id,
					phone: fresh.phone,
					reason,
				});
				run.blocked24h += 1;
				return;
			}

			const history = await deps.getRecentHistory(fresh.id);
			console.log(`[scheduler-debug] Evaluando seguimiento para conversación ID: ${fresh.id} (Teléfono: ${fresh.phone}, Intentos previos: ${fresh.followup_attempts}).`);
			console.log(`[scheduler-debug] Historial cargado: ${history.length} mensaje(s).`);
			if (history.length > 0) {
				console.log(`[scheduler-debug] Últimos mensajes del historial:`);
				history.slice(-3).forEach((m) => {
					console.log(`  - [${m.role}]: "${m.content.slice(0, 80)}${m.content.length > 80 ? '...' : ''}"`);
				});
			}

			const decision = await deps.decideFollowUp(history);
			if (!decision.ok) {
				console.log(`[scheduler-debug] Error llamando a DeepSeek: ${decision.reason}`);
				await deps.repo.recordConversationEvent({
					conversation_id: fresh.id,
					event_type: "deepseek_json_invalid",
					actor_role: "assistant",
					reason: decision.reason,
					created_at: now,
				});
				run.invalidDecisions += 1;
				return;
			}
			const message = decision.parsed.message?.trim() ?? "";
			if (!decision.parsed.shouldSend || !message) {
				console.log(`[scheduler-debug] Decisión DeepSeek: NO enviar seguimiento.`);
				await deps.repo.recordConversationEvent({
					conversation_id: fresh.id,
					event_type: "followup_skipped",
					actor_role: "assistant",
					reason: "deepseek_decision_no",
					created_at: now,
				});
				run.skippedByDecision += 1;
				return;
			}

			const cleanText = (txt: string) =>
				txt
					.toLowerCase()
					.normalize("NFD")
					.replace(/[\u0300-\u036f]/g, "")
					.replace(/[^a-z0-9]/g, "");

			const cleanNew = cleanText(message);
			const isDuplicate = history.some(
				(m) => m.role === "assistant" && cleanText(m.content) === cleanNew,
			);

			if (isDuplicate) {
				console.log(`[scheduler-debug] Decisión omitida: El mensaje de seguimiento ya se envió antes (duplicado detectado).`);
				await deps.repo.recordConversationEvent({
					conversation_id: fresh.id,
					event_type: "followup_skipped",
					actor_role: "assistant",
					reason: "duplicate_followup_message",
					created_at: now,
				});
				run.skippedByDecision += 1;
				return;
			}

			console.log(`[scheduler-debug] Decisión DeepSeek: SI enviar seguimiento. Mensaje: "${message}"`);

			await deps.sendWhatsAppMessage(
				fresh.jid ?? `${fresh.phone}@s.whatsapp.net`,
				message,
			);
			await deps.repo.insertMessageAndTouchConversation({
				conversation_id: fresh.id,
				direction: "outbound",
				role: "assistant",
				content: message,
				media_type: "text",
				source: "scheduler",
				from_me: false,
				created_at: now,
			});
			await deps.repo.updateConversation(fresh.id, {
				followup_attempts: fresh.followup_attempts + 1,
				last_followup_at: now,
				last_assistant_message_at: now,
				updated_at: now,
			});
			await deps.repo.recordConversationEvent({
				conversation_id: fresh.id,
				event_type: "followup_sent",
				actor_role: "assistant",
				reason: "deepseek_decision_si",
				created_at: now,
			});
			run.sent += 1;
		} finally {
			await deps.turnState.releaseFollowupConversationLock(candidate.id, token);
		}
	}

	return {
		async runOnce(): Promise<FollowUpRunResult> {
			const now = deps.now(),
				runnerToken = deps.generateToken();
			if (
				!(await deps.turnState.acquireFollowupRunnerLock(runnerToken, {
					ttlMs: 300_000,
				}))
			)
				return result("skipped_runner_locked");
			const run = result("completed");
			try {
				const settings = await deps.repo.getSettings();
				const query = {
					now,
					minHoursAfterAssistant: n(
						settings,
						"followup_min_hours_after_assistant",
					),
					maxAttempts: n(settings, "followup_max_attempts"),
					freeformWindowHours: n(settings, "whatsapp_freeform_window_hours"),
					blockOutside24h: b(settings, "block_outside_24h_followups"),
				};
				const candidates = await deps.repo.getPendingFollowUps(query);
				run.candidates = candidates.length;
				for (const candidate of candidates)
					await processCandidate(candidate, query, run, now);
				run.processed =
					run.sent +
					run.blocked24h +
					run.skippedByDecision +
					run.invalidDecisions;
				return run;
			} finally {
				await deps.turnState.releaseFollowupRunnerLock(runnerToken);
			}
		},
	};
}
