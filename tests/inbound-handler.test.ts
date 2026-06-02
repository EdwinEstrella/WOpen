import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInMemoryRepository } from "../src/lib/db-contract.ts";
import {
	createInMemoryTurnState,
	redisTurnKeys,
} from "../src/lib/redis-turn-state.ts";
import {
	createInboundHandler,
	type InboundHandlerDeps,
	type WhatsAppUpsert,
} from "../src/lib/baileys/inbound-handler.ts";

const at = (value: string) => new Date(value);

function upsert(input: {
	type?: string;
	remoteJid?: string;
	id?: string;
	fromMe?: boolean;
	text?: string;
	name?: string;
	timestamp?: Date;
	senderPn?: string;
}): WhatsAppUpsert {
	return {
		type: input.type ?? "notify",
		messages: [
			{
				key: {
					remoteJid: input.remoteJid ?? "549111@s.whatsapp.net",
					id: input.id ?? "wamid-1",
					fromMe: input.fromMe ?? false,
					senderPn: input.senderPn,
				},
				pushName: input.name ?? "Cliente",
				messageTimestamp: input.timestamp ?? at("2026-06-04T12:00:00Z"),
				message: { conversation: input.text ?? "Hola" },
			},
		],
	};
}

function makeDeps() {
	const repo = createInMemoryRepository();
	const turnState = createInMemoryTurnState();
	const calls: string[] = [];
	const sent: string[] = [];
	const sentJids: string[] = [];
	const telegram: unknown[] = [];
	let deepSeekRaw =
		'{"response":{"part_1":"Hola","part_2":"¿En qué te ayudo?","part_3":""},"handoff":{"required":false,"reason":""}}';
	const deps: InboundHandlerDeps = {
		now: () => at("2026-06-04T12:00:00Z"),
		repo: {
			...repo,
			getSettings: () => ({ ...repo.getSettings(), debounce_ms: 0 }),
		},
		turnState,
		getRecentHistory: async (conversationId) => {
			calls.push(`history:${conversationId}`);
			return [{ role: "user", content: "Hola" }];
		},
		getActiveSystemPrompt: async () => {
			calls.push("prompt");
			return "system prompt";
		},
		callDeepSeek: async (input) => {
			calls.push(`deepseek:${input.conversationId}`);
			return deepSeekRaw;
		},
		sendMessage: async (jid, text) => {
			calls.push(`send:${text}`);
			sent.push(text);
			sentJids.push(jid);
		},
		notifyTelegramHumanNeeded: async (payload) => {
			calls.push("telegram");
			telegram.push(payload);
		},
		generateToken: () => "token-a",
		readMessages: async () => {},
		sendPresenceUpdate: async () => {},
	};
	return {
		repo,
		turnState,
		calls,
		sent,
		sentJids,
		telegram,
		setDeepSeekRaw: (raw: string) => {
			deepSeekRaw = raw;
		},
		handler: createInboundHandler(deps),
	};
}

describe("owner-aware inbound handler filters", () => {
	it("ignores non-notify upserts, groups, and non-1:1 JIDs", async () => {
		for (const event of [
			upsert({ type: "append" }),
			upsert({ remoteJid: "123@g.us" }),
			upsert({ remoteJid: "group.g.us" }),
			upsert({ remoteJid: "status@broadcast" }),
		]) {
			const { handler, repo, calls } = makeDeps();
			const result = await handler.handleUpsert(event);
			assert.equal(result.processed, 0);
			assert.equal(repo.getOrCreateConversation({ phone: "probe" }).id, 1);
			assert.deepEqual(calls, []);
		}
	});

	it("applies message dedupe before LLM/send and duplicate stops without persistence", async () => {
		const { handler, repo, sent, calls } = makeDeps();
		await handler.handleUpsert(upsert({ id: "dupe-1", text: "Hola" }));
		await handler.handleUpsert(upsert({ id: "dupe-1", text: "Hola otra vez" }));

		const convo = repo.getOrCreateConversation({ phone: "549111" });
		assert.equal(
			convo.last_user_message_at?.toISOString(),
			"2026-06-04T12:00:00.000Z",
		);
		assert.equal(sent.length, 2);
		assert.equal(
			calls.filter((call) => call.startsWith("deepseek:")).length,
			1,
		);
	});

	it("uses senderPn as canonical chat JID for @lid inbound messages", async () => {
		const { handler, repo, sentJids } = makeDeps();
		await handler.handleUpsert(
			upsert({
				id: "lid-1",
				remoteJid: "171855029772514@lid",
				senderPn: "18496294358@s.whatsapp.net",
				text: "Hola desde LID",
			}),
		);

		const convo = repo.getOrCreateConversation({ phone: "18496294358" });
		assert.equal(convo.jid, "171855029772514@lid");
		assert.deepEqual(sentJids, [
			"18496294358@s.whatsapp.net",
			"18496294358@s.whatsapp.net",
		]);
	});
});

describe("owner-aware inbound handler owner controls", () => {
	it("persists accepted messages before DeepSeek and distinguishes customer user role", async () => {
		const { handler, repo, calls } = makeDeps();
		await handler.handleUpsert(
			upsert({ id: "m-user", fromMe: false, text: "bot off" }),
		);

		const convo = repo.getOrCreateConversation({ phone: "549111" });
		assert.equal(convo.mode, "AI");
		assert.equal(
			convo.last_user_message_at?.toISOString(),
			"2026-06-04T12:00:00.000Z",
		);
		assert.ok(
			calls.indexOf(`history:${convo.id}`) <
				calls.indexOf(`deepseek:${convo.id}`),
		);
	});

	it("owner non-activation message sets or refreshes HUMAN and does not call DeepSeek", async () => {
		const { handler, repo, calls } = makeDeps();
		await handler.handleUpsert(
			upsert({ id: "m-owner-intervention", fromMe: true, text: "Me encargo" }),
		);

		const convo = repo.getOrCreateConversation({ phone: "549111" });
		assert.equal(convo.mode, "HUMAN");
		assert.equal(convo.mode_reason, "owner_intervention_whatsapp");
		assert.equal(
			convo.last_human_message_at?.toISOString(),
			"2026-06-04T12:00:00.000Z",
		);
		assert.equal(
			calls.some((call) => call.startsWith("deepseek:")),
			false,
		);
	});

	it("owner on keyword changes mode to AI and does not call DeepSeek until next customer message", async () => {
		const { handler, repo, calls } = makeDeps();
		const convo = repo.getOrCreateConversation({
			phone: "549111",
			jid: "549111@s.whatsapp.net",
		});
		repo.updateConversation(convo.id, { mode: "HUMAN" });

		await handler.handleUpsert(
			upsert({ id: "m-owner-on", fromMe: true, text: "ok." }),
		);
		assert.equal(repo.getConversationById(convo.id)?.mode, "AI");
		assert.equal(
			repo.getConversationById(convo.id)?.mode_reason,
			"owner_keyword_on",
		);
		assert.equal(
			calls.some((call) => call.startsWith("deepseek:")),
			false,
		);

		await handler.handleUpsert(
			upsert({ id: "m-customer-after-on", fromMe: false, text: "Hola" }),
		);
		assert.equal(
			calls.some((call) => call.startsWith("deepseek:")),
			true,
		);
	});

	it("owner non-activation message in HUMAN keeps HUMAN instead of timed reactivation", async () => {
		const { handler, repo } = makeDeps();
		const convo = repo.getOrCreateConversation({
			phone: "549111",
			jid: "549111@s.whatsapp.net",
		});
		repo.updateConversation(convo.id, {
			mode: "HUMAN",
			last_owner_intervention_at: at("2026-06-01T12:00:00Z"),
		});

		await handler.handleUpsert(
			upsert({
				id: "m-owner-human-refresh",
				fromMe: true,
				text: "Ya respondí",
			}),
		);

		assert.equal(repo.getConversationById(convo.id)?.mode, "HUMAN");
		assert.equal(
			repo.getConversationById(convo.id)?.mode_reason,
			"owner_intervention_whatsapp",
		);
		assert.equal(
			repo.getConversationById(convo.id)?.last_ai_reactivated_at,
			null,
		);
	});
});

describe("owner-aware inbound handler AI/HUMAN customer paths", () => {
	it("awaits async repository and turn-state dependencies", async () => {
		const base = makeDeps();
		const asyncRepo: InboundHandlerDeps["repo"] = {
			getOrCreateConversation: async (input) =>
				base.repo.getOrCreateConversation(input),
			getConversationById: async (id) => base.repo.getConversationById(id),
			insertMessageAndTouchConversation: async (input) =>
				base.repo.insertMessageAndTouchConversation(input),
			setMode: async (id, mode, input) => base.repo.setMode(id, mode, input),
			recordConversationEvent: async (input) =>
				base.repo.recordConversationEvent(input),
			getSettings: async () => ({ ...base.repo.getSettings(), debounce_ms: 0 }),
		};
		const asyncTurnState: InboundHandlerDeps["turnState"] = {
			acceptDedupeMessage: async (messageId, options) =>
				base.turnState.acceptDedupeMessage(messageId, options),
			enqueueTurnMessage: async (conversationId, item, options) =>
				base.turnState.enqueueTurnMessage(conversationId, item, options),
			setDebounceMarker: async (conversationId, input) =>
				base.turnState.setDebounceMarker(conversationId, input),
			getDebounceMarker: async (conversationId) =>
				base.turnState.getDebounceMarker(conversationId),
			acquireProcessingLock: async (conversationId, token, options) =>
				base.turnState.acquireProcessingLock(conversationId, token, options),
			getQueuedTurnMessages: async (conversationId) =>
				base.turnState.getQueuedTurnMessages(conversationId),
			setProcessingState: async (conversationId, state, options) =>
				base.turnState.setProcessingState(conversationId, state, options),
			cleanupTurnState: async (conversationId, token) =>
				base.turnState.cleanupTurnState(conversationId, token),
		};
		const handler = createInboundHandler({
			now: () => at("2026-06-04T12:00:00Z"),
			repo: asyncRepo,
			turnState: asyncTurnState,
			getRecentHistory: async () => [{ role: "user", content: "Hola" }],
			getActiveSystemPrompt: async () => "system prompt",
			callDeepSeek: async () =>
				'{"response":{"part_1":"Hola","part_2":"","part_3":""},"handoff":{"required":false,"reason":""}}',
			sendMessage: async (_jid, text) => {
				base.sent.push(text);
			},
			notifyTelegramHumanNeeded: async () => {},
			generateToken: () => "token-a",
			readMessages: async () => {},
			sendPresenceUpdate: async () => {},
		});

		await handler.handleUpsert(
			upsert({ id: "m-async-deps", fromMe: false, text: "Hola" }),
		);

		const convo = base.repo.getOrCreateConversation({ phone: "549111" });
		assert.deepEqual(base.sent, ["Hola"]);
		assert.equal(base.turnState.hasActiveTurnState(convo.id), false);
	});

	it("HUMAN mode customer message persists and does not call DeepSeek", async () => {
		const { handler, repo, calls } = makeDeps();
		const convo = repo.getOrCreateConversation({
			phone: "549111",
			jid: "549111@s.whatsapp.net",
		});
		repo.updateConversation(convo.id, { mode: "HUMAN" });

		await handler.handleUpsert(
			upsert({ id: "m-human-mode", fromMe: false, text: "Hola" }),
		);

		assert.equal(
			repo.getConversationById(convo.id)?.last_user_message_at?.toISOString(),
			"2026-06-04T12:00:00.000Z",
		);
		assert.equal(
			calls.some((call) => call.startsWith("deepseek:")),
			false,
		);
	});

	it("AI mode customer message enqueues, locks, reads history/prompt, sends valid parts, persists assistant messages, and finalizes", async () => {
		const { handler, repo, sent, calls, turnState } = makeDeps();
		await handler.handleUpsert(
			upsert({ id: "m-ai", fromMe: false, text: "Necesito info" }),
		);

		const convo = repo.getOrCreateConversation({ phone: "549111" });
		assert.deepEqual(sent, ["Hola", "¿En qué te ayudo?"]);
		assert.deepEqual(
			calls.slice(
				calls.indexOf(`history:${convo.id}`),
				calls.indexOf("send:Hola"),
			),
			[`history:${convo.id}`, "prompt", `deepseek:${convo.id}`],
		);
		assert.equal(
			repo.getConversationById(convo.id)?.last_assistant_message_at instanceof
				Date,
			true,
		);
		assert.equal(turnState.hasActiveTurnState(convo.id), false);
	});

	it("lock acquisition failure does not delete another processor's active turn state", async () => {
		const { handler, repo, sent, calls, turnState } = makeDeps();
		const convo = repo.getOrCreateConversation({
			phone: "549111",
			jid: "549111@s.whatsapp.net",
		});
		turnState.enqueueTurnMessage(
			convo.id,
			{
				messageId: "existing",
				dbMessageId: 99,
				text: "mensaje previo",
				mediaType: "text",
				createdAt: "2026-06-04T11:59:00.000Z",
			},
			{ ttlSeconds: 300 },
		);
		turnState.setDebounceMarker(convo.id, {
			fireAtMs: Date.parse("2026-06-04T12:00:12.000Z"),
			ttlMs: 72_000,
		});
		turnState.acquireProcessingLock(convo.id, "other-token", {
			ttlMs: 90_000,
		});
		turnState.setProcessingState(
			convo.id,
			{
				token: "other-token",
				startedAt: "2026-06-04T11:59:00.000Z",
				messageIds: ["existing"],
			},
			{ ttlMs: 95_000 },
		);

		const result = await handler.handleUpsert(
			upsert({ id: "m-lock-fail", fromMe: false, text: "Otro mensaje" }),
		);

		assert.deepEqual(sent, []);
		assert.equal(
			calls.some((call) => call.startsWith("deepseek:")),
			false,
		);
		assert.equal(
			turnState.inspectKey(redisTurnKeys.turnLock(convo.id))?.value,
			"other-token",
		);
		assert.notEqual(
			turnState.inspectKey(redisTurnKeys.turnQueue(convo.id)),
			null,
		);
		assert.notEqual(
			turnState.inspectKey(redisTurnKeys.debounceMarker(convo.id)),
			null,
		);
		assert.notEqual(
			turnState.inspectKey(redisTurnKeys.processingMarker(convo.id)),
			null,
		);
		assert.deepEqual(result.results[0]?.cleanup?.removedKeys, []);
	});

	it("DeepSeek handoff required changes mode to HUMAN and emits Telegram notification intent", async () => {
		const { handler, repo, telegram, setDeepSeekRaw } = makeDeps();
		setDeepSeekRaw(
			'{"response":{"part_1":"Te derivo con una persona.","part_2":"","part_3":""},"handoff":{"required":true,"reason":"cliente pide asesor"}}',
		);

		await handler.handleUpsert(
			upsert({ id: "m-handoff", fromMe: false, text: "Quiero un asesor" }),
		);

		const convo = repo.getOrCreateConversation({ phone: "549111" });
		assert.equal(repo.getConversationById(convo.id)?.mode, "HUMAN");
		assert.equal(
			repo.getConversationById(convo.id)?.mode_reason,
			"cliente pide asesor",
		);
		assert.equal(telegram.length, 1);
		assert.deepEqual(
			repo
				.listEvents()
				.map((event) => event.event_type)
				.filter((type) => type === "handoff_to_human"),
			["handoff_to_human"],
		);
	});

	it("invalid DeepSeek JSON does not send raw text and still finalizes without auth cleanup", async () => {
		const { handler, repo, sent, turnState, setDeepSeekRaw } = makeDeps();
		setDeepSeekRaw("texto libre no json");

		const result = await handler.handleUpsert(
			upsert({ id: "m-invalid-json", fromMe: false, text: "Hola" }),
		);
		const convo = repo.getOrCreateConversation({ phone: "549111" });

		assert.deepEqual(sent, []);
		assert.equal(turnState.hasActiveTurnState(convo.id), false);
		assert.equal(
			result.results[0]?.cleanup?.neverTouches.includes("./auth/"),
			true,
		);
		assert.equal(
			repo
				.listEvents()
				.some((event) => event.event_type === "deepseek_json_invalid"),
			true,
		);
	});
});
