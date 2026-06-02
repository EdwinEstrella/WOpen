import pg from "pg";
import {
	DATABASE_SCHEMA_SQL,
	DEFAULT_SETTINGS,
	type ConversationRow,
	type MessageRow,
	type InsertMessageInput,
	type FollowUpQueryInput,
	type ModeChangedBy,
	type ConversationEventType,
	type EventActorRole,
	type ConversationEventRow,
} from "./db-contract.ts";
import type { ConversationMode } from "../domain/whatsapp-rules.ts";
import { createPostgresRepository, initializePostgresSchema } from "./postgres-adapter.ts";
import { createTelegramNotifier } from "./telegram-notifier.ts";

const { Pool } = pg;

// Inicialización del pool de conexión real de pg usando la URL de entorno
const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
	connectionString,
});

// Inicializamos el repositorio pasándole el pool de pg
const repo = createPostgresRepository(pool);

// Helper para inicializar la base de datos al arrancar
let schemaInitialized = false;
export async function ensureSchemaInitialized() {
	if (schemaInitialized) return;
	try {
		await initializePostgresSchema(pool);
		schemaInitialized = true;
		console.log("[db] Esquema de PostgreSQL inicializado correctamente.");
	} catch (error) {
		console.error("[db] Error al inicializar el esquema de PostgreSQL:", error);
	}
}

// Ejecutamos la inicialización del esquema asincrónicamente al importar
ensureSchemaInitialized().catch(() => {});

// 1. getOrCreateConversation(phone, jid?, name?)
export async function getOrCreateConversation(
	phone: string,
	jid?: string | null,
	name?: string | null,
): Promise<ConversationRow> {
	await ensureSchemaInitialized();
	return repo.getOrCreateConversation({ phone, jid, name });
}

// 2. getConversationById(id)
export async function getConversationById(id: number): Promise<ConversationRow | null> {
	await ensureSchemaInitialized();
	return repo.getConversationById(id);
}

// 3. insertMessageAndTouchConversation(input)
export async function insertMessageAndTouchConversation(input: InsertMessageInput): Promise<MessageRow> {
	await ensureSchemaInitialized();
	return repo.insertMessageAndTouchConversation(input);
}

// 4. messageExistsByWhatsappId(whatsappMessageId)
export async function messageExistsByWhatsappId(whatsappMessageId: string): Promise<boolean> {
	await ensureSchemaInitialized();
	const res = await pool.query("SELECT 1 FROM messages WHERE whatsapp_message_id = $1 LIMIT 1", [
		whatsappMessageId,
	]);
	return res.rows.length > 0;
}

// 5. getPendingFollowUps(...)
export async function getPendingFollowUps(input: FollowUpQueryInput): Promise<ConversationRow[]> {
	await ensureSchemaInitialized();
	return repo.getPendingFollowUps(input);
}

// 6. incrementFollowUpAttempt(conversationId)
export async function incrementFollowUpAttempt(conversationId: number): Promise<ConversationRow> {
	await ensureSchemaInitialized();
	return repo.incrementFollowUpAttempt(conversationId);
}

// 7. markFollowUpBlocked(conversationId, reason)
export async function markFollowUpBlocked(conversationId: number, reason: string): Promise<ConversationEventRow> {
	await ensureSchemaInitialized();
	return repo.markFollowUpBlocked(conversationId, reason);
}

// 8. getMessages(conversationId, limit = 50)
export async function getMessages(conversationId: number, limit = 50): Promise<MessageRow[]> {
	await ensureSchemaInitialized();
	const res = await pool.query<MessageRow>(
		"SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT $2",
		[conversationId, limit],
	);
	return res.rows;
}

// 9. getRecentHistory(conversationId, limit = 20)
export async function getRecentHistory(conversationId: number, limit = 20): Promise<MessageRow[]> {
	await ensureSchemaInitialized();
	return repo.getRecentMessages(conversationId, limit);
}

// 10. setMode(conversationId, mode, { reason, changedBy })
export async function setMode(
	conversationId: number,
	mode: ConversationMode,
	input: {
		reason: string;
		changedBy: ModeChangedBy;
		eventType?: ConversationEventType;
		metadata?: Record<string, unknown>;
	},
): Promise<ConversationEventRow | null> {
	await ensureSchemaInitialized();
	return repo.setMode(conversationId, mode, input);
}

// 11. recordConversationEvent(conversationId, eventType, actorRole, reason?, metadata?)
export async function recordConversationEvent(input: {
	conversation_id: number;
	event_type: ConversationEventType;
	actor_role: EventActorRole;
	reason?: string | null;
	metadata?: Record<string, unknown>;
}): Promise<ConversationEventRow> {
	await ensureSchemaInitialized();
	return repo.recordConversationEvent(input);
}

// 12. getSettings()
export async function getSettings(): Promise<Record<string, unknown>> {
	await ensureSchemaInitialized();
	return repo.getSettings();
}

// 13. setSetting(key, value)
export async function setSetting(key: string, value: unknown): Promise<void> {
	await ensureSchemaInitialized();
	await pool.query(
		`INSERT INTO settings (key, value, updated_at)
		 VALUES ($1, $2, NOW())
		 ON CONFLICT (key)
		 DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
		[key, JSON.stringify(value)],
	);
}

// 14. listConversations()
export interface ConversationListRow extends ConversationRow {
	last_message_content?: string | null;
	last_message_role?: string | null;
}
export async function listConversations(): Promise<ConversationListRow[]> {
	await ensureSchemaInitialized();
	const res = await pool.query<ConversationListRow>(
		`SELECT c.*, 
		        m.content AS last_message_content, 
		        m.role AS last_message_role
		 FROM conversations c
		 LEFT JOIN connection_state cs ON cs.id = 1
		 LEFT JOIN LATERAL (
		   SELECT content, role
		   FROM messages
		   WHERE conversation_id = c.id
		   ORDER BY created_at DESC
		   LIMIT 1
		 ) m ON TRUE
		 WHERE c.phone <> cs.phone OR cs.phone IS NULL
		 ORDER BY c.last_message_at DESC NULLS LAST, c.id DESC`
	);
	return res.rows;
}

// 15. getConnectionState()
export interface ConnectionStateRow {
	id: number;
	status: "disconnected" | "qr" | "connecting" | "connected";
	qr_string?: string | null;
	phone?: string | null;
	updated_at: Date;
}
export async function getConnectionState(): Promise<ConnectionStateRow> {
	await ensureSchemaInitialized();
	const res = await pool.query<ConnectionStateRow>(
		"SELECT * FROM connection_state WHERE id = 1 LIMIT 1"
	);
	if (res.rows[0]) return res.rows[0];

	// Si no existe, insertamos el estado inicial por defecto
	const created = await pool.query<ConnectionStateRow>(
		`INSERT INTO connection_state (id, status, updated_at)
		 VALUES (1, 'disconnected', NOW())
		 RETURNING *`
	);
	return created.rows[0];
}

// 16. setConnectionState({status, qr_string?, phone?})
export async function setConnectionState(input: {
	status: "disconnected" | "qr" | "connecting" | "connected";
	qr_string?: string | null;
	phone?: string | null;
}): Promise<ConnectionStateRow> {
	await ensureSchemaInitialized();
	const res = await pool.query<ConnectionStateRow>(
		`INSERT INTO connection_state (id, status, qr_string, phone, updated_at)
		 VALUES (1, $1, $2, $3, NOW())
		 ON CONFLICT (id)
		 DO UPDATE SET status = EXCLUDED.status,
		               qr_string = EXCLUDED.qr_string,
		               phone = EXCLUDED.phone,
		               updated_at = NOW()
		 RETURNING *`,
		[input.status, input.qr_string ?? null, input.phone ?? null]
	);
	return res.rows[0];
}

// 17. enqueueOutbox(conversationId, phone, content)
export async function enqueueOutbox(conversationId: number, phone: string, content: string): Promise<any> {
	await ensureSchemaInitialized();
	const res = await pool.query(
		`INSERT INTO outbox (conversation_id, phone, content, created_at)
		 VALUES ($1, $2, $3, NOW())
		 RETURNING *`,
		[conversationId, phone, content]
	);
	return res.rows[0];
}

// 18. getPendingOutbox(limit = 20)
export async function getPendingOutbox(limit = 20): Promise<any[]> {
	await ensureSchemaInitialized();
	const res = await pool.query(
		`SELECT * FROM outbox WHERE sent = 0 ORDER BY created_at ASC LIMIT $1`,
		[limit]
	);
	return res.rows;
}

// 19. markOutboxSent(id)
export async function markOutboxSent(id: number): Promise<void> {
	await ensureSchemaInitialized();
	await pool.query("UPDATE outbox SET sent = 1 WHERE id = $1", [id]);
}

// 20. deleteConversation(id)
export async function deleteConversation(id: number): Promise<void> {
	await ensureSchemaInitialized();
	await pool.query("DELETE FROM conversations WHERE id = $1", [id]);
}

// 21. getActiveSystemPrompt()
export async function getActiveSystemPrompt(): Promise<string> {
	await ensureSchemaInitialized();
	const res = await pool.query<{ content: string }>(
		"SELECT content FROM system_prompts WHERE is_active = TRUE LIMIT 1"
	);
	if (res.rows[0]) return res.rows[0].content;

	// Si no hay ninguno activo, insertamos el por defecto y lo devolvemos
	const fallbackContent = `Eres un asistente virtual amable. Responde en español neutro, en mensajes breves de 2 a 4 líneas. No uses emojis.

Siempre responde con JSON válido:
{
  "response": {
    "part_1": "mensaje breve obligatorio",
    "part_2": "mensaje opcional o string vacío",
    "part_3": "mensaje opcional o string vacío"
  },
  "handoff": {
    "required": false,
    "reason": ""
  }
}

Usa handoff.required=true como herramienta Humano cuando el cliente pida una persona/asesor, esté listo para cerrar, esté molesto, haga una objeción crítica, pida algo que no debes inventar o necesite intervención humana. En ese caso, incluye reason claro y una respuesta breve para avisar que será derivado.`;

	await pool.query(
		`INSERT INTO system_prompts (title, content, is_active, created_at)
		 VALUES ('Asistente Default', $1, TRUE, NOW())
		 ON CONFLICT DO NOTHING`,
		[fallbackContent]
	);
	return fallbackContent;
}

// 22. CRUD Adicional para system_prompts
export interface SystemPromptRow {
	id: number;
	title: string;
	content: string;
	is_active: boolean;
	created_at: Date;
}

export async function getAllSystemPrompts(): Promise<SystemPromptRow[]> {
	await ensureSchemaInitialized();
	const res = await pool.query<SystemPromptRow>(
		"SELECT * FROM system_prompts ORDER BY id ASC"
	);
	return res.rows;
}

export async function saveSystemPrompt(title: string, content: string): Promise<SystemPromptRow> {
	await ensureSchemaInitialized();
	const res = await pool.query<SystemPromptRow>(
		`INSERT INTO system_prompts (title, content, is_active, created_at)
		 VALUES ($1, $2, FALSE, NOW())
		 RETURNING *`,
		[title, content]
	);
	return res.rows[0];
}

export async function setActiveSystemPrompt(id: number): Promise<void> {
	await ensureSchemaInitialized();
	await pool.query("BEGIN");
	try {
		await pool.query("UPDATE system_prompts SET is_active = FALSE");
		await pool.query("UPDATE system_prompts SET is_active = TRUE WHERE id = $1", [id]);
		await pool.query("COMMIT");
	} catch (error) {
		await pool.query("ROLLBACK");
		throw error;
	}
}

// 23. notifyTelegramHumanNeeded
export async function notifyTelegramHumanNeeded(input: {
	conversation: { id: number; phone: string; jid?: string | null };
	reason: string;
	lastMessage: string;
}): Promise<void> {
	const botToken = process.env.TELEGRAM_BOT_TOKEN;
	const chatId = process.env.TELEGRAM_CHAT_ID;

	const notifier = createTelegramNotifier({
		botToken,
		chatId,
		fetch: globalThis.fetch as any,
	});

	await notifier.notifyHumanoHandoff({
		conversationId: input.conversation.id,
		phone: input.conversation.phone,
		jid: input.conversation.jid || "",
		reason: input.reason,
		lastMessage: input.lastMessage,
	});
}

// 24. updateConversation(id, patch)
export async function updateConversation(
	id: number,
	patch: Partial<ConversationRow>,
): Promise<ConversationRow> {
	await ensureSchemaInitialized();
	return repo.updateConversation(id, patch);
}

