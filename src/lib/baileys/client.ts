import {
	makeWASocket,
	DisconnectReason,
	useMultiFileAuthState,
	fetchLatestBaileysVersion,
	Browsers,
} from "@whiskeysockets/baileys";
import pino from "pino";
import fs from "node:fs";
import { Redis } from "ioredis";
import { createIoredisTurnState } from "../redis-adapter.ts";
import { createInboundHandler } from "./inbound-handler.ts";
import { runtimePaths, clearDirectoryContents } from "../runtime-paths.ts";
import {
	getConnectionState,
	setConnectionState,
	getOrCreateConversation,
	getConversationById,
	insertMessageAndTouchConversation,
	updateConversation,
	setMode,
	recordConversationEvent,
	getSettings,
	getRecentHistory,
	getActiveSystemPrompt,
	notifyTelegramHumanNeeded,
	getPendingOutbox,
	markOutboxSent,
	listConversations,
} from "../db.ts";

const logger = pino({ level: "silent" });
const authDir = runtimePaths.authDir;
const dataDir = runtimePaths.dataDir;

for (const dir of [authDir, dataDir]) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
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
		updateConversation,
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
	fetchProfilePictureUrl: async (jid) => {
		if (!globalSock) return null;
		try {
			return (await globalSock.profilePictureUrl(jid, "image")) ?? null;
		} catch {
			return null;
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
				const jid = item.phone.includes("@")
					? item.phone
					: `${item.phone}@s.whatsapp.net`;
				console.log(
					`[bot] Enviando mensaje de Outbox a ${jid}: "${item.content.substring(0, 30)}..."`,
				);
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

async function refreshAllProfilePictures() {
	if (!globalSock) return;
	try {
		console.log("[bot] Iniciando actualización proactiva de fotos de perfil...");
		const conversations = await listConversations();
		const now = new Date();
		for (const convo of conversations) {
			const jid = convo.jid || (convo.phone.includes("@") ? convo.phone : `${convo.phone}@s.whatsapp.net`);
			const shouldRefresh = !convo.profile_picture_url || 
				!convo.profile_picture_fetched_at || 
				(now.getTime() - new Date(convo.profile_picture_fetched_at).getTime() > 24 * 60 * 60 * 1000);
			
			if (shouldRefresh) {
				try {
					console.log(`[bot] Consultando foto de perfil de ${jid} a WhatsApp...`);
					const url = await globalSock.profilePictureUrl(jid, "image");
					await updateConversation(convo.id, {
						profile_picture_url: url || null,
						profile_picture_fetched_at: now,
					});
					// Delay para no sobrecargar el socket
					await new Promise((resolve) => setTimeout(resolve, 1000));
				} catch (err: any) {
					console.log(`[bot] No se pudo obtener foto de perfil para ${jid}: ${err.message || err}`);
					// Guardamos la fecha de intento para no volver a intentar hasta dentro de 24h
					await updateConversation(convo.id, {
						profile_picture_fetched_at: now,
					});
					await new Promise((resolve) => setTimeout(resolve, 500));
				}
			}
		}
		console.log("[bot] Finalizada la actualización proactiva de fotos de perfil.");
	} catch (error) {
		console.error("[bot] Error en refreshAllProfilePictures:", error);
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
			console.log(
				`[bot] Usando última versión de Baileys detectada: ${version.join(".")}`,
			);
		}
	} catch (err) {
		console.warn(
			"[bot] No se pudo obtener la última versión de Baileys de forma dinámica, usando fallback.",
		);
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
				const generateFn = qrcodeTerminal.default?.generate || qrcodeTerminal.generate;
				if (typeof generateFn === "function") {
					generateFn(qr, { small: true });
				} else {
					console.warn("[bot] No se encontro la funcion generate en qrcode-terminal");
				}
			} catch (error) {
				console.warn("[bot] No se pudo imprimir el QR en consola:", error);
			}
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
			void refreshAllProfilePictures();
		}

		// 4. Estado de conexión: close (desconectado/caído)
		if (connection === "close") {
			stopOutboxProcessor();
			const status = (lastDisconnect?.error as any)?.output?.statusCode || 0;
			console.log(`[bot] Conexión cerrada. Status code: ${status}`);

			if (status === DisconnectReason.loggedOut) {
				console.log(
					"[bot] Sesión cerrada (loggedOut). Limpiando credenciales.",
				);
				await setConnectionState({
					status: "disconnected",
					qr_string: null,
					phone: null,
				});
				try {
					clearDirectoryContents(authDir);
				} catch (error) {
					console.warn(
						"[bot] No se pudo limpiar el directorio de credenciales:",
						error,
					);
				}
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
		console.log(
			`[bot-debug] messages.upsert recibido. Tipo: ${upsert.type}, Cantidad: ${upsert.messages?.length}`,
		);
		for (const msg of upsert.messages || []) {
			console.log(
				`[bot-debug] Mensaje key: ${JSON.stringify(msg.key)}, pushName: ${msg.pushName}, timestamp: ${msg.messageTimestamp}`,
			);
		}
		try {
			await inboundHandler.handleUpsert(upsert);
		} catch (error) {
			console.error(
				"[bot] Error procesando mensaje entrante en handleUpsert:",
				error,
			);
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
		} catch (error) {
			console.warn("[bot] Error cerrando el socket anterior:", error);
		}
		globalSock = null;
	}
}
