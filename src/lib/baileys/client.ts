import {
	makeWASocket,
	DisconnectReason,
	useMultiFileAuthState,
	fetchLatestBaileysVersion,
	Browsers,
} from "@whiskeysockets/baileys";
import pino from "pino";
import fs from "node:fs";
import path from "node:path";
import { Redis } from "ioredis";
import { createIoredisTurnState } from "../redis-adapter.ts";
import { createInboundHandler } from "./inbound-handler.ts";
import {
	getConnectionState,
	setConnectionState,
	getOrCreateConversation,
	getConversationById,
	insertMessageAndTouchConversation,
	setMode,
	recordConversationEvent,
	getSettings,
	getRecentHistory,
	getActiveSystemPrompt,
	notifyTelegramHumanNeeded,
	getPendingOutbox,
	markOutboxSent,
} from "../db.ts";

const logger = pino({ level: "silent" });
const authDir = path.resolve(process.cwd(), "auth");
const dataDir = path.resolve(process.cwd(), "data");

if (!fs.existsSync(dataDir)) {
	fs.mkdirSync(dataDir, { recursive: true });
}

// Cliente global de Redis
const redisClient = new Redis(process.env.REDIS_URL || "redis://redis:6379");
const turnState = createIoredisTurnState(redisClient as any);

// Instancia global del socket y controlador de reconexión
export let globalSock: ReturnType<typeof makeWASocket> | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let outboxInterval: NodeJS.Timeout | null = null;

// Creamos el Inbound Handler inyectando las dependencias necesarias
export const inboundHandler = createInboundHandler({
	now: () => new Date(),
	repo: {
		getOrCreateConversation: (input) =>
			getOrCreateConversation(input.phone, input.jid, input.name),
		getConversationById,
		insertMessageAndTouchConversation,
		setMode,
		recordConversationEvent,
		getSettings,
	},
	turnState,
	getRecentHistory,
	getActiveSystemPrompt,
	callDeepSeek: async (input) => {
		const { deepseek } = await import("../Deepseek.ts");
		const res = await deepseek.generateNormalReply({
			systemPrompt: input.systemPrompt,
			history: input.history,
			queuedMessages: input.queuedMessages,
		});
		if (!res.ok) {
			throw new Error(res.reason);
		}
		return res.rawContent;
	},
	sendMessage: async (jid, text) => {
		if (globalSock) {
			await globalSock.sendMessage(jid, { text });
		} else {
			throw new Error("[bot] Socket no conectado. No se puede enviar mensaje.");
		}
	},
	notifyTelegramHumanNeeded: async (payload) => {
		await notifyTelegramHumanNeeded({
			conversation: {
				id: payload.conversationId,
				phone: payload.phone,
				jid: payload.jid,
			},
			reason: payload.reason,
			lastMessage: payload.lastMessage,
		});
	},
	generateToken: () => Math.random().toString(36).substring(2, 15),
	readMessages: async (keys) => {
		if (globalSock) {
			await globalSock.readMessages(keys);
		}
	},
	sendPresenceUpdate: async (presence, jid) => {
		if (globalSock) {
			await globalSock.sendPresenceUpdate(presence, jid);
		}
	},
});

// Loop que procesa la cola de salida (Outbox) cada 2 segundos
function startOutboxProcessor() {
	if (outboxInterval) return;
	outboxInterval = setInterval(async () => {
		if (!globalSock) return;
		try {
			const pending = await getPendingOutbox(20);
			for (const item of pending) {
				const jid = item.phone.includes("@") ? item.phone : `${item.phone}@s.whatsapp.net`;
				console.log(`[bot] Enviando mensaje de Outbox a ${jid}: "${item.content.substring(0, 30)}..."`);
				await globalSock.sendMessage(jid, { text: item.content });
				await markOutboxSent(item.id);
			}
		} catch (error) {
			console.error("[bot] Error en el procesador de Outbox:", error);
		}
	}, 2000);
}

function stopOutboxProcessor() {
	if (outboxInterval) {
		clearInterval(outboxInterval);
		outboxInterval = null;
	}
}

// Función principal para iniciar el socket de Baileys
export async function startWASocket() {
	console.log("[bot] Iniciando conexión con WhatsApp...");
	
	let version: [number, number, number] | undefined;
	try {
		const fetched = await fetchLatestBaileysVersion();
		version = fetched.version;
		if (version) {
			console.log(`[bot] Usando última versión de Baileys detectada: ${version.join(".")}`);
		}
	} catch (err) {
		console.warn("[bot] No se pudo obtener la última versión de Baileys de forma dinámica, usando fallback.");
	}

	const { state, saveCreds } = await useMultiFileAuthState(authDir);

	const sock = makeWASocket({
		version: version as any,
		auth: state,
		logger,
		browser: Browsers.macOS("Desktop"), // Browser fingerprint conocido
		markOnlineOnConnect: false,
		syncFullHistory: false,
	});

	globalSock = sock;

	sock.ev.on("creds.update", saveCreds);

	sock.ev.on("connection.update", async (update: any) => {
		const { connection, lastDisconnect, qr } = update;

		// 1. Manejo del código QR
		if (qr) {
			console.log("[bot] Código QR generado, actualizando estado de conexión.");
			await setConnectionState({
				status: "qr",
				qr_string: qr,
				phone: null,
			});
			// Generar ASCII QR de fallback en consola
			try {
				const qrcodeTerminal = await import("qrcode-terminal");
				qrcodeTerminal.generate(qr, { small: true });
			} catch {}
		}

		// 2. Estado de conexión: connecting
		if (connection === "connecting") {
			const current = await getConnectionState();
			if (current.status === "disconnected") {
				await setConnectionState({
					status: "connecting",
					qr_string: current.qr_string,
					phone: null,
				});
			}
		}

		// 3. Estado de conexión: open (conectado)
		if (connection === "open") {
			console.log("[bot] Conexión abierta con éxito.");
			const rawId = sock.user?.id || "";
			const numericPhone = rawId.split(":")[0] || rawId.split("@")[0] || "";
			console.log(`[bot] Número de teléfono conectado: ${numericPhone}`);

			await setConnectionState({
				status: "connected",
				qr_string: null,
				phone: numericPhone,
			});

			startOutboxProcessor();
		}

		// 4. Estado de conexión: close (desconectado/caído)
		if (connection === "close") {
			stopOutboxProcessor();
			const status = (lastDisconnect?.error as any)?.output?.statusCode || 0;
			console.log(`[bot] Conexión cerrada. Status code: ${status}`);

			if (status === DisconnectReason.loggedOut) {
				console.log("[bot] Sesión cerrada (loggedOut). Limpiando credenciales.");
				await setConnectionState({
					status: "disconnected",
					qr_string: null,
					phone: null,
				});
				try {
					fs.rmSync(authDir, { recursive: true, force: true });
				} catch {}
				globalSock = null;
			} else {
				// Reconexión con backoff
				const delay = status === 440 ? 15000 : 5000;
				console.log(`[bot] Intentando reconectar en ${delay / 1000}s...`);
				scheduleReconnect(delay);
			}
		}
	});

	// Registro del handler de mensajes entrantes con depuración
	sock.ev.on("messages.upsert", async (upsert: any) => {
		console.log(`[bot-debug] messages.upsert recibido. Tipo: ${upsert.type}, Cantidad: ${upsert.messages?.length}`);
		for (const msg of upsert.messages || []) {
			console.log(`[bot-debug] Mensaje key: ${JSON.stringify(msg.key)}, pushName: ${msg.pushName}, timestamp: ${msg.messageTimestamp}`);
		}
		try {
			await inboundHandler.handleUpsert(upsert);
		} catch (error) {
			console.error("[bot] Error procesando mensaje entrante en handleUpsert:", error);
		}
	});
}

// Programador de reconexión defensivo
function scheduleReconnect(delay: number) {
	if (reconnectTimer) return;
	reconnectTimer = setTimeout(async () => {
		reconnectTimer = null;
		await shutdownWASocket();
		await startWASocket();
	}, delay);
}

// Cierre seguro del socket viejo y limpieza de listeners
export async function shutdownWASocket() {
	stopOutboxProcessor();
	if (globalSock) {
		try {
			globalSock.ev.removeAllListeners("connection.update");
			globalSock.ev.removeAllListeners("creds.update");
			globalSock.ev.removeAllListeners("messages.upsert");
			globalSock.end(undefined);
		} catch {}
		globalSock = null;
	}
}
