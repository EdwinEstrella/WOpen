import type {
	ConversationMode,
	MessageRole,
	LeadLabel,
} from "../domain/whatsapp-rules.ts";
import type {
	CrmTaskPriority,
	CrmTaskStatus,
	CrmTaskType,
} from "./crm-tasks.ts";

export type MessageDirection = "inbound" | "outbound";
export type MessageSource =
	| "whatsapp"
	| "dashboard"
	| "bot"
	| "scheduler"
	| "system";
export type MediaType = "text" | "image" | "audio" | "unknown";
export type ModeChangedBy = "system" | "owner" | "dashboard" | "assistant";
export type ConversationEventType =
	| "bot_disabled"
	| "bot_enabled"
	| "handoff_to_human"
	| "followup_sent"
	| "followup_skipped"
	| "followup_blocked_24h"
	| "deepseek_json_invalid"
	| "turn_failed";
export type EventActorRole = MessageRole | "system";

export const DEFAULT_SETTINGS = {
	bot_on_keyword: "ok.",
	keyword_match_mode: "exact",
	keyword_case_sensitive: false,
	debounce_ms: 12_000,
	processing_lock_ttl_ms: 90_000,
	dedupe_ttl_seconds: 86_400,
	conversation_queue_ttl_seconds: 300,
	followup_interval_hours: 12,
	followup_interval_minutes: 0,
	followup_min_hours_after_assistant: 12,
	followup_min_minutes_after_assistant: 0,
	followup_max_attempts: 2,
	whatsapp_freeform_window_hours: 24,
	block_outside_24h_followups: true,
	chat_ai_provider: "deepseek",
	chat_ai_base_url: "https://api.deepseek.com",
	chat_ai_api_key: "",
	chat_ai_model: "deepseek-v4-pro",
	audio_ai_provider: "openai",
	audio_ai_base_url: "https://api.openai.com/v1",
	audio_ai_api_key: "",
	audio_ai_model: "gpt-4o-transcribe",
	image_ai_provider: "openai",
	image_ai_base_url: "https://api.openai.com/v1",
	image_ai_api_key: "",
	image_ai_model: "gpt-4o-mini",
} as const;

export const DATABASE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY, phone TEXT UNIQUE NOT NULL, jid TEXT UNIQUE, name TEXT,
  profile_picture_url TEXT, profile_picture_fetched_at TIMESTAMP WITH TIME ZONE,
  mode TEXT CHECK(mode IN ('AI','HUMAN')) NOT NULL DEFAULT 'AI', mode_reason TEXT,
  mode_changed_at TIMESTAMP WITH TIME ZONE, mode_changed_by TEXT CHECK(mode_changed_by IN ('system','owner','dashboard','assistant')),
  followup_attempts INTEGER NOT NULL DEFAULT 0, last_followup_at TIMESTAMP WITH TIME ZONE,
  followup_blocked_at TIMESTAMP WITH TIME ZONE, followup_blocked_reason TEXT, last_message_at TIMESTAMP WITH TIME ZONE,
  last_user_message_at TIMESTAMP WITH TIME ZONE, last_assistant_message_at TIMESTAMP WITH TIME ZONE,
  last_human_message_at TIMESTAMP WITH TIME ZONE, last_owner_intervention_at TIMESTAMP WITH TIME ZONE,
  last_ai_reactivated_at TIMESTAMP WITH TIME ZONE, unread_count INTEGER NOT NULL DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  lead_labels JSONB NOT NULL DEFAULT '[]'::jsonb,
  lead_score INTEGER CHECK(lead_score IS NULL OR (lead_score >= 0 AND lead_score <= 100)),
  lead_score_reason TEXT,
  lead_updated_at TIMESTAMP WITH TIME ZONE,
  lead_updated_by TEXT CHECK(lead_updated_by IS NULL OR lead_updated_by IN ('assistant','dashboard')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY, conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  whatsapp_message_id TEXT, direction TEXT CHECK(direction IN ('inbound','outbound')) NOT NULL,
  role TEXT CHECK(role IN ('user','assistant','human')) NOT NULL, content TEXT NOT NULL,
  media_type TEXT CHECK(media_type IN ('text','image','audio','unknown')) DEFAULT 'text',
  source TEXT CHECK(source IN ('whatsapp','dashboard','bot','scheduler','system')) NOT NULL DEFAULT 'whatsapp',
  from_me BOOLEAN NOT NULL DEFAULT FALSE, raw_timestamp TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_whatsapp_id ON messages(whatsapp_message_id) WHERE whatsapp_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversation_id, created_at);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW());
INSERT INTO settings (key, value) VALUES
  ('bot_on_keyword', '"ok."'::jsonb), ('keyword_match_mode', '"exact"'::jsonb),
  ('keyword_case_sensitive', 'false'::jsonb), ('debounce_ms', '30000'::jsonb),
  ('processing_lock_ttl_ms', '90000'::jsonb), ('dedupe_ttl_seconds', '86400'::jsonb), ('conversation_queue_ttl_seconds', '300'::jsonb),
  ('followup_interval_hours', '12'::jsonb), ('followup_interval_minutes', '0'::jsonb), ('followup_min_hours_after_assistant', '12'::jsonb), ('followup_min_minutes_after_assistant', '0'::jsonb), ('followup_max_attempts', '2'::jsonb),
  ('whatsapp_freeform_window_hours', '24'::jsonb), ('block_outside_24h_followups', 'true'::jsonb),
  ('chat_ai_provider', '"deepseek"'::jsonb), ('chat_ai_base_url', '"https://api.deepseek.com"'::jsonb), ('chat_ai_api_key', '""'::jsonb), ('chat_ai_model', '"deepseek-v4-pro"'::jsonb),
  ('audio_ai_provider', '"openai"'::jsonb), ('audio_ai_base_url', '"https://api.openai.com/v1"'::jsonb), ('audio_ai_api_key', '""'::jsonb), ('audio_ai_model', '"gpt-4o-transcribe"'::jsonb),
  ('image_ai_provider', '"openai"'::jsonb), ('image_ai_base_url', '"https://api.openai.com/v1"'::jsonb), ('image_ai_api_key', '""'::jsonb), ('image_ai_model', '"gpt-4o-mini"'::jsonb)
ON CONFLICT (key) DO NOTHING;
CREATE TABLE IF NOT EXISTS conversation_events (
  id SERIAL PRIMARY KEY, conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE, event_type TEXT NOT NULL,
  actor_role TEXT CHECK(actor_role IN ('user','assistant','human','system')) NOT NULL, reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conversation_events_conv_created ON conversation_events(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS system_prompts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS automations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  trigger_type TEXT CHECK(trigger_type IN ('incoming_message')) NOT NULL,
  definition JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_automations_enabled_trigger ON automations(enabled, trigger_type);

CREATE TABLE IF NOT EXISTS crm_tasks (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK(status IN ('pending','in_progress','done')) NOT NULL DEFAULT 'pending',
  task_type TEXT CHECK(task_type IN ('call_client','follow_up','evaluate_lead','set_label','custom')) NOT NULL DEFAULT 'custom',
  lead_label TEXT CHECK(lead_label IS NULL OR lead_label IN ('frio','neutro','caliente','cliente_potencial')),
  priority TEXT CHECK(priority IN ('low','medium','high')) NOT NULL DEFAULT 'medium',
  due_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_status_due ON crm_tasks(status, due_at NULLS LAST, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_conversation ON crm_tasks(conversation_id);

CREATE TABLE IF NOT EXISTS connection_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  status TEXT CHECK(status IN ('disconnected','qr','connecting','connected')) NOT NULL DEFAULT 'disconnected',
  qr_string TEXT,
  phone TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO connection_state (id, status)
VALUES (1, 'disconnected')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS outbox (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL,
  phone TEXT NOT NULL,
  content TEXT NOT NULL,
  sent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox(sent, created_at);
`;

export interface ConversationRow {
	id: number;
	phone: string;
	jid: string | null;
	name: string | null;
	profile_picture_url: string | null;
	profile_picture_fetched_at: Date | null;
	mode: ConversationMode;
	mode_reason: string | null;
	mode_changed_at: Date | null;
	mode_changed_by: ModeChangedBy | null;
	followup_attempts: number;
	last_followup_at: Date | null;
	followup_blocked_at: Date | null;
	followup_blocked_reason: string | null;
	last_message_at: Date | null;
	last_user_message_at: Date | null;
	last_assistant_message_at: Date | null;
	last_human_message_at: Date | null;
	last_owner_intervention_at: Date | null;
	last_ai_reactivated_at: Date | null;
	unread_count: number;
	is_archived: boolean;
	lead_labels: LeadLabel[];
	lead_score: number | null;
	lead_score_reason: string | null;
	lead_updated_at: Date | null;
	lead_updated_by: "assistant" | "dashboard" | null;
	created_at: Date;
	updated_at: Date;
}
export interface CrmTaskDbRow {
	id: number;
	conversation_id: number | null;
	title: string;
	description: string | null;
	status: CrmTaskStatus;
	task_type: CrmTaskType;
	lead_label: LeadLabel | null;
	priority: CrmTaskPriority;
	due_at: Date | null;
	created_at: Date;
	updated_at: Date;
}
export interface MessageRow {
	id: number;
	conversation_id: number;
	whatsapp_message_id: string | null;
	direction: MessageDirection;
	role: MessageRole;
	content: string;
	media_type: MediaType;
	source: MessageSource;
	from_me: boolean;
	raw_timestamp: Date | null;
	created_at: Date;
	metadata: Record<string, unknown>;
}
export interface ConversationEventRow {
	id: number;
	conversation_id: number;
	event_type: ConversationEventType;
	actor_role: EventActorRole;
	reason: string | null;
	metadata: Record<string, unknown>;
	created_at: Date;
}
export interface InsertMessageInput {
	conversation_id: number;
	whatsapp_message_id?: string | null;
	direction: MessageDirection;
	role: MessageRole;
	content: string;
	media_type?: MediaType;
	source: MessageSource;
	from_me?: boolean;
	raw_timestamp?: Date | null;
	created_at?: Date;
	metadata?: Record<string, unknown>;
}
export interface FollowUpQueryInput {
	now: Date;
	minHoursAfterAssistant: number;
	maxAttempts: number;
	freeformWindowHours: number;
	blockOutside24h: boolean;
}

const nowDate = () => new Date();
const hoursBetween = (later: Date, earlier: Date) =>
	(later.getTime() - earlier.getTime()) / 3_600_000;
const actorFor = (changedBy: ModeChangedBy): EventActorRole =>
	changedBy === "assistant"
		? "assistant"
		: changedBy === "system"
			? "system"
			: "human";

export function createInMemoryRepository() {
	const conversations: ConversationRow[] = [],
		messages: MessageRow[] = [],
		events: ConversationEventRow[] = [];
	let nextConversationId = 1,
		nextMessageId = 1,
		nextEventId = 1;

	const repo = {
		getOrCreateConversation(input: {
			phone: string;
			jid?: string | null;
			name?: string | null;
		}): ConversationRow {
			const existing = conversations.find(
				(row) =>
					row.phone === input.phone || (input.jid && row.jid === input.jid),
			);
			if (existing) {
				if (
					input.phone &&
					existing.phone !== input.phone &&
					input.jid &&
					existing.jid === input.jid
				) {
					existing.phone = input.phone;
					existing.updated_at = nowDate();
				}
				if (input.jid && existing.jid !== input.jid) {
					existing.jid = input.jid;
					existing.updated_at = nowDate();
				}
				return existing;
			}
			const created = nowDate();
			const row: ConversationRow = {
				id: nextConversationId++,
				phone: input.phone,
				jid: input.jid ?? null,
				name: input.name ?? null,
				profile_picture_url: null,
				profile_picture_fetched_at: null,
				mode: "AI",
				mode_reason: null,
				mode_changed_at: null,
				mode_changed_by: null,
				followup_attempts: 0,
				last_followup_at: null,
				followup_blocked_at: null,
				followup_blocked_reason: null,
				last_message_at: null,
				last_user_message_at: null,
				last_assistant_message_at: null,
				last_human_message_at: null,
				last_owner_intervention_at: null,
				last_ai_reactivated_at: null,
				unread_count: 0,
				is_archived: false,
				lead_labels: [],
				lead_score: null,
				lead_score_reason: null,
				lead_updated_at: null,
				lead_updated_by: null,
				created_at: created,
				updated_at: created,
			};
			conversations.push(row);
			return row;
		},
		getConversationById(id: number) {
			return conversations.find((row) => row.id === id) ?? null;
		},
		updateConversation(
			id: number,
			patch: Partial<ConversationRow>,
		): ConversationRow {
			const row = repo.getConversationById(id);
			if (!row) throw new Error(`conversation_not_found:${id}`);
			Object.assign(row, patch, { updated_at: patch.updated_at ?? nowDate() });
			return row;
		},
		insertMessageAndTouchConversation(input: InsertMessageInput): MessageRow {
			const conversation = repo.getConversationById(input.conversation_id);
			if (!conversation)
				throw new Error(`conversation_not_found:${input.conversation_id}`);
			if (
				input.whatsapp_message_id &&
				messages.some(
					(row) => row.whatsapp_message_id === input.whatsapp_message_id,
				)
			)
				throw new Error(
					`duplicate_whatsapp_message_id:${input.whatsapp_message_id}`,
				);
			const createdAt = input.created_at ?? nowDate();
			const message: MessageRow = {
				id: nextMessageId++,
				conversation_id: input.conversation_id,
				whatsapp_message_id: input.whatsapp_message_id ?? null,
				direction: input.direction,
				role: input.role,
				content: input.content,
				media_type: input.media_type ?? "text",
				source: input.source,
				from_me: input.from_me ?? false,
				raw_timestamp: input.raw_timestamp ?? null,
				created_at: createdAt,
				metadata: input.metadata ?? {},
			};
			messages.push(message);
			conversation.last_message_at = createdAt;
			conversation.updated_at = createdAt;
			if (message.role === "user") {
				conversation.last_user_message_at = createdAt;
				conversation.followup_attempts = 0;
				conversation.followup_blocked_at = null;
				conversation.followup_blocked_reason = null;
			} else if (message.role === "assistant")
				conversation.last_assistant_message_at = createdAt;
			else {
				conversation.last_human_message_at = createdAt;
				if (message.from_me || message.source === "whatsapp")
					conversation.last_owner_intervention_at = createdAt;
			}
			return message;
		},
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
		) {
			const changedAt = input.changedAt ?? nowDate(),
				previous = repo.getConversationById(id);
			repo.updateConversation(id, {
				mode,
				mode_reason: input.reason,
				mode_changed_by: input.changedBy,
				mode_changed_at: changedAt,
				last_ai_reactivated_at:
					mode === "AI" && input.reason === "owner_keyword_on"
						? changedAt
						: (previous?.last_ai_reactivated_at ?? null),
				updated_at: changedAt,
			});
			return input.eventType
				? repo.recordConversationEvent({
						conversation_id: id,
						event_type: input.eventType,
						actor_role: actorFor(input.changedBy),
						reason: input.reason,
						metadata: input.metadata ?? {},
						created_at: changedAt,
					})
				: null;
		},
		recordConversationEvent(input: {
			conversation_id: number;
			event_type: ConversationEventType;
			actor_role: EventActorRole;
			reason?: string | null;
			metadata?: Record<string, unknown>;
			created_at?: Date;
		}): ConversationEventRow {
			if (!repo.getConversationById(input.conversation_id))
				throw new Error(`conversation_not_found:${input.conversation_id}`);
			const event = {
				id: nextEventId++,
				conversation_id: input.conversation_id,
				event_type: input.event_type,
				actor_role: input.actor_role,
				reason: input.reason ?? null,
				metadata: input.metadata ?? {},
				created_at: input.created_at ?? nowDate(),
			};
			events.push(event);
			return event;
		},
		markFollowUpBlocked(
			conversationId: number,
			reason: string,
			blockedAt = nowDate(),
		) {
			repo.updateConversation(conversationId, {
				followup_blocked_at: blockedAt,
				followup_blocked_reason: reason,
				updated_at: blockedAt,
			});
			return repo.recordConversationEvent({
				conversation_id: conversationId,
				event_type: "followup_blocked_24h",
				actor_role: "system",
				reason,
				metadata: { boundary: "whatsapp_freeform_window" },
				created_at: blockedAt,
			});
		},
		getPendingFollowUps(input: FollowUpQueryInput): ConversationRow[] {
			return conversations.filter((conversation) => {
				if (
					conversation.mode !== "AI" ||
					conversation.followup_attempts >= input.maxAttempts
				)
					return false;
				const rows = messages
					.filter((message) => message.conversation_id === conversation.id)
					.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
				const latest = rows.at(-1);
				if (!latest || latest.role !== "assistant") return false;
				if (
					hoursBetween(input.now, latest.created_at) <
					input.minHoursAfterAssistant
				)
					return false;
				if (
					rows.some(
						(message) =>
							message.role === "user" && message.created_at > latest.created_at,
					)
				)
					return false;
				return true;
			});
		},
		getSettings() {
			return { ...DEFAULT_SETTINGS };
		},
		listEvents() {
			return [...events];
		},
	};
	return repo;
}
