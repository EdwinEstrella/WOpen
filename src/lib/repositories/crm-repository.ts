import type {
	AuditEventRow,
	ConversationCrmLinkRow,
	CrmAccountRow,
	CrmContactAccountLinkRow,
	CrmContactMethodRow,
	CrmContactRow,
} from "../db-contract.ts";

type Queryable = {
	query<T = unknown>(
		text: string,
		values?: readonly unknown[],
	): Promise<{ rows: T[] }>;
};

const nowDate = () => new Date();
const normalizeMethodValue = (value: string) => value.trim();
const mappingSnapshot = (
	row:
		| Pick<ConversationCrmLinkRow, "contact_id" | "account_id">
		| null
		| undefined,
) => ({
	contact_id: row?.contact_id ?? null,
	account_id: row?.account_id ?? null,
});

export interface CrmRepository {
	createAccount(input: {
		team_id?: number | null;
		name: string;
		owner_user_id?: number | null;
		created_at?: Date;
	}): Promise<CrmAccountRow>;
	createContact(input: {
		team_id?: number | null;
		display_name?: string | null;
		owner_user_id?: number | null;
		created_at?: Date;
	}): Promise<CrmContactRow>;
	getContactById(contactId: number): Promise<CrmContactRow | null>;
	addContactMethod(input: {
		contact_id: number;
		method_type: string;
		value: string;
		normalized_value?: string;
		is_primary?: boolean;
		created_at?: Date;
	}): Promise<CrmContactMethodRow>;
	listContactMethods(contactId: number): Promise<CrmContactMethodRow[]>;
	linkContactToAccount(input: {
		contact_id: number;
		account_id: number;
		created_at?: Date;
	}): Promise<CrmContactAccountLinkRow>;
	listAccountLinksByContactId(
		contactId: number,
	): Promise<CrmContactAccountLinkRow[]>;
	reassignContactOwner(input: {
		contact_id: number;
		owner_user_id: number | null;
		actor_user_id?: number | null;
		team_id?: number | null;
		request_metadata?: Record<string, unknown>;
		changed_at?: Date;
	}): Promise<CrmContactRow>;
	getConversationCrmLink(
		conversationId: number,
	): Promise<ConversationCrmLinkRow | null>;
	setConversationCrmLink(input: {
		conversation_id: number;
		contact_id: number | null;
		account_id?: number | null;
		actor_user_id?: number | null;
		team_id?: number | null;
		request_metadata?: Record<string, unknown>;
		updated_at?: Date;
	}): Promise<ConversationCrmLinkRow>;
	listAuditEvents(): Promise<AuditEventRow[]>;
}

async function recordAudit(
	db: Queryable,
	input: {
		actor_user_id?: number | null;
		team_id?: number | null;
		entity_type: string;
		entity_id: string;
		action: string;
		before_json?: Record<string, unknown>;
		after_json?: Record<string, unknown>;
		request_metadata?: Record<string, unknown>;
		created_at: Date;
	},
) {
	await db.query(
		`INSERT INTO audit_events (
		 actor_user_id, team_id, entity_type, entity_id, action,
		 before_json, after_json, request_metadata, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		[
			input.actor_user_id ?? null,
			input.team_id ?? null,
			input.entity_type,
			input.entity_id,
			input.action,
			input.before_json ?? {},
			input.after_json ?? {},
			input.request_metadata ?? {},
			input.created_at,
		],
	);
}

export function createPostgresCrmRepository(db: Queryable): CrmRepository {
	return {
		async createAccount(input) {
			const at = input.created_at ?? nowDate();
			const result = await db.query<CrmAccountRow>(
				`INSERT INTO crm_accounts (team_id, name, owner_user_id, created_at, updated_at)
				 VALUES ($1, $2, $3, $4, $4)
				 RETURNING *`,
				[input.team_id ?? null, input.name, input.owner_user_id ?? null, at],
			);
			return result.rows[0];
		},
		async createContact(input) {
			const at = input.created_at ?? nowDate();
			const result = await db.query<CrmContactRow>(
				`INSERT INTO crm_contacts (team_id, display_name, owner_user_id, created_at, updated_at)
				 VALUES ($1, $2, $3, $4, $4)
				 RETURNING *`,
				[
					input.team_id ?? null,
					input.display_name ?? null,
					input.owner_user_id ?? null,
					at,
				],
			);
			return result.rows[0];
		},
		async getContactById(contactId) {
			const result = await db.query<CrmContactRow>(
				"SELECT * FROM crm_contacts WHERE id = $1 LIMIT 1",
				[contactId],
			);
			return result.rows[0] ?? null;
		},
		async addContactMethod(input) {
			const result = await db.query<CrmContactMethodRow>(
				`INSERT INTO crm_contact_methods (
				 contact_id, method_type, value, normalized_value, is_primary, created_at
				) VALUES ($1, $2, $3, $4, $5, $6)
				RETURNING *`,
				[
					input.contact_id,
					input.method_type,
					input.value,
					input.normalized_value ?? normalizeMethodValue(input.value),
					input.is_primary ?? false,
					input.created_at ?? nowDate(),
				],
			);
			return result.rows[0];
		},
		async listContactMethods(contactId) {
			const result = await db.query<CrmContactMethodRow>(
				"SELECT * FROM crm_contact_methods WHERE contact_id = $1 ORDER BY id ASC",
				[contactId],
			);
			return result.rows;
		},
		async linkContactToAccount(input) {
			const result = await db.query<CrmContactAccountLinkRow>(
				`INSERT INTO crm_contact_account_links (contact_id, account_id, created_at)
				 VALUES ($1, $2, $3)
				 RETURNING *`,
				[input.contact_id, input.account_id, input.created_at ?? nowDate()],
			);
			return result.rows[0];
		},
		async listAccountLinksByContactId(contactId) {
			const result = await db.query<CrmContactAccountLinkRow>(
				"SELECT * FROM crm_contact_account_links WHERE contact_id = $1 ORDER BY id ASC",
				[contactId],
			);
			return result.rows;
		},
		async reassignContactOwner(input) {
			const at = input.changed_at ?? nowDate();
			const before = await this.getContactById(input.contact_id);
			const result = await db.query<CrmContactRow>(
				`UPDATE crm_contacts
				 SET owner_user_id = $1, updated_at = $2
				 WHERE id = $3
				 RETURNING *`,
				[input.owner_user_id, at, input.contact_id],
			);
			const row = result.rows[0];
			if (!row) {
				throw new Error(`CRM contact ${input.contact_id} not found`);
			}
			await recordAudit(db, {
				actor_user_id: input.actor_user_id,
				team_id: input.team_id ?? row.team_id ?? before?.team_id ?? null,
				entity_type: "crm_contact",
				entity_id: String(input.contact_id),
				action: "crm_contact.owner_reassigned",
				before_json: { owner_user_id: before?.owner_user_id ?? null },
				after_json: { owner_user_id: row.owner_user_id ?? null },
				request_metadata: input.request_metadata,
				created_at: at,
			});
			return row;
		},
		async getConversationCrmLink(conversationId) {
			const result = await db.query<ConversationCrmLinkRow>(
				"SELECT * FROM conversation_crm_links WHERE conversation_id = $1 LIMIT 1",
				[conversationId],
			);
			return result.rows[0] ?? null;
		},
		async setConversationCrmLink(input) {
			const at = input.updated_at ?? nowDate();
			const before = await this.getConversationCrmLink(input.conversation_id);
			const result = await db.query<ConversationCrmLinkRow>(
				`INSERT INTO conversation_crm_links (
				 conversation_id, contact_id, account_id, created_at, updated_at
				) VALUES ($1, $2, $3, $4, $4)
				ON CONFLICT (conversation_id) DO UPDATE
				SET contact_id = EXCLUDED.contact_id,
				    account_id = EXCLUDED.account_id,
				    updated_at = EXCLUDED.updated_at
				RETURNING *`,
				[
					input.conversation_id,
					input.contact_id,
					input.account_id ?? null,
					at,
				],
			);
			const row = result.rows[0];
			await recordAudit(db, {
				actor_user_id: input.actor_user_id,
				team_id: input.team_id ?? null,
				entity_type: "conversation_crm_link",
				entity_id: String(input.conversation_id),
				action: before ? "conversation.crm_remapped" : "conversation.crm_linked",
				before_json: mappingSnapshot(before),
				after_json: mappingSnapshot(row),
				request_metadata: input.request_metadata,
				created_at: at,
			});
			return row;
		},
		async listAuditEvents() {
			const result = await db.query<AuditEventRow>(
				"SELECT * FROM audit_events ORDER BY id ASC",
			);
			return result.rows;
		},
	};
}

export function createInMemoryCrmRepository(): CrmRepository {
	const accounts: CrmAccountRow[] = [];
	const contacts: CrmContactRow[] = [];
	const methods: CrmContactMethodRow[] = [];
	const accountLinks: CrmContactAccountLinkRow[] = [];
	const conversationLinks: ConversationCrmLinkRow[] = [];
	const audits: AuditEventRow[] = [];
	let nextAccountId = 1;
	let nextContactId = 1;
	let nextMethodId = 1;
	let nextAccountLinkId = 1;
	let nextConversationLinkId = 1;
	let nextAuditId = 1;

	return {
		async createAccount(input) {
			const at = input.created_at ?? nowDate();
			const row: CrmAccountRow = {
				id: nextAccountId++,
				team_id: input.team_id ?? null,
				name: input.name,
				owner_user_id: input.owner_user_id ?? null,
				created_at: at,
				updated_at: at,
			};
			accounts.push(row);
			return row;
		},
		async createContact(input) {
			const at = input.created_at ?? nowDate();
			const row: CrmContactRow = {
				id: nextContactId++,
				team_id: input.team_id ?? null,
				display_name: input.display_name ?? null,
				owner_user_id: input.owner_user_id ?? null,
				created_at: at,
				updated_at: at,
			};
			contacts.push(row);
			return row;
		},
		async getContactById(contactId) {
			return contacts.find((row) => row.id === contactId) ?? null;
		},
		async addContactMethod(input) {
			const row: CrmContactMethodRow = {
				id: nextMethodId++,
				contact_id: input.contact_id,
				method_type: input.method_type,
				value: input.value,
				normalized_value: input.normalized_value ?? normalizeMethodValue(input.value),
				is_primary: input.is_primary ?? false,
				created_at: input.created_at ?? nowDate(),
			};
			methods.push(row);
			return row;
		},
		async listContactMethods(contactId) {
			return methods.filter((row) => row.contact_id === contactId);
		},
		async linkContactToAccount(input) {
			const row: CrmContactAccountLinkRow = {
				id: nextAccountLinkId++,
				contact_id: input.contact_id,
				account_id: input.account_id,
				created_at: input.created_at ?? nowDate(),
			};
			accountLinks.push(row);
			return row;
		},
		async listAccountLinksByContactId(contactId) {
			return accountLinks.filter((row) => row.contact_id === contactId);
		},
		async reassignContactOwner(input) {
			const row = contacts.find((contact) => contact.id === input.contact_id);
			if (!row) throw new Error(`CRM contact ${input.contact_id} not found`);
			const beforeOwner = row.owner_user_id;
			row.owner_user_id = input.owner_user_id;
			row.updated_at = input.changed_at ?? nowDate();
			audits.push({
				id: nextAuditId++,
				actor_user_id: input.actor_user_id ?? null,
				team_id: input.team_id ?? row.team_id ?? null,
				entity_type: "crm_contact",
				entity_id: String(row.id),
				action: "crm_contact.owner_reassigned",
				before_json: { owner_user_id: beforeOwner },
				after_json: { owner_user_id: row.owner_user_id },
				request_metadata: input.request_metadata ?? {},
				created_at: row.updated_at,
			});
			return row;
		},
		async getConversationCrmLink(conversationId) {
			return (
				conversationLinks.find((row) => row.conversation_id === conversationId) ?? null
			);
		},
		async setConversationCrmLink(input) {
			const at = input.updated_at ?? nowDate();
			const existing =
				conversationLinks.find((row) => row.conversation_id === input.conversation_id) ??
				null;
			const before = existing ? mappingSnapshot(existing) : { contact_id: null, account_id: null };
			const row = existing ?? {
				id: nextConversationLinkId++,
				conversation_id: input.conversation_id,
				contact_id: null,
				account_id: null,
				created_at: at,
				updated_at: at,
			};
			row.contact_id = input.contact_id;
			row.account_id = input.account_id ?? null;
			row.updated_at = at;
			if (!existing) conversationLinks.push(row);
			audits.push({
				id: nextAuditId++,
				actor_user_id: input.actor_user_id ?? null,
				team_id: input.team_id ?? null,
				entity_type: "conversation_crm_link",
				entity_id: String(input.conversation_id),
				action: existing ? "conversation.crm_remapped" : "conversation.crm_linked",
				before_json: before,
				after_json: mappingSnapshot(row),
				request_metadata: input.request_metadata ?? {},
				created_at: at,
			});
			return row;
		},
		async listAuditEvents() {
			return [...audits];
		},
	};
}
