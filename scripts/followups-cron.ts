import "./env-loader";
import { createFollowUpScheduler } from "../src/lib/followup-scheduler.ts";
import { createIoredisTurnState } from "../src/lib/redis-adapter.ts";
import { deepseek } from "../src/lib/Deepseek.ts";
import { createTelegramNotifier } from "../src/lib/telegram-notifier.ts";
import {
	getSettings,
	getPendingFollowUps,
	getConversationById,
	insertMessageAndTouchConversation,
	updateConversation,
	recordConversationEvent,
	markFollowUpBlocked,
	getRecentHistory,
} from "../src/lib/db.ts";
import { Redis } from "ioredis";

const redisClient = new Redis(process.env.REDIS_URL || "redis://redis:6379");
const turnState = createIoredisTurnState(redisClient);

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const notifier = createTelegramNotifier({
	botToken,
	chatId,
	fetch: globalThis.fetch as any,
});

const scheduler = createFollowUpScheduler({
	now: () => new Date(),
	repo: {
		getSettings,
		getPendingFollowUps,
		getConversationById,
		insertMessageAndTouchConversation,
		updateConversation,
		recordConversationEvent,
		markFollowUpBlocked,
	},
	turnState,
	getRecentHistory,
	decideFollowUp: async (history) => {
		const res = await deepseek.generateFollowUpDecision({ history });
		if (!res.ok) {
			return { ok: false, reason: res.reason };
		}
		return { ok: true, parsed: res.parsed };
	},
	sendWhatsAppMessage: async (jid, text) => {
		const { globalSock } = await import("../src/lib/baileys/client.ts");
		if (globalSock) {
			await globalSock.sendMessage(jid, { text });
		} else {
			throw new Error("[scheduler] WhatsApp socket no conectado.");
		}
	},
	notifyFollowupBlocked: async (input) => {
		return notifier.notifyFollowupBlocked({
			conversationId: input.conversationId,
			phone: input.phone,
			reason: input.reason,
		});
	},
	generateToken: () => Math.random().toString(36).substring(2, 15),
});

export async function runFollowupSchedulerOnce() {
	try {
		const result = await scheduler.runOnce();
		// Solo mostramos logs en consola si hubo candidatos encontrados o se procesó/envió algún seguimiento
		if (result && (result.candidates > 0 || result.processed > 0 || result.sent > 0)) {
			console.log("[scheduler] Ejecutando verificación de follow-ups...");
			console.log("[scheduler] Verificación completada con actividad:", result);
		}
		return result;
	} catch (error) {
		console.error("[scheduler] Error ejecutando el followup scheduler:", error);
	}
}

export function startFollowupsCron() {
	// Evaluamos candidatos de seguimiento cada 1 minuto (el scheduler se encarga de aplicar los filtros temporales)
	console.log("[scheduler] Iniciando loop de follow-ups (evaluación cada 1 minuto)...");
	
	// Primera ejecución inmediata
	runFollowupSchedulerOnce().catch(() => {});
	
	setInterval(async () => {
		await runFollowupSchedulerOnce();
	}, 60000);
}
