import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DATABASE_SCHEMA_SQL } from "../src/lib/db-contract.ts";
import { createInMemoryCrmRepository } from "../src/lib/repositories/crm-repository.ts";

describe("crm AI suggestions schema", () => {
	it("declares queryable suggestion records and indexes", () => {
		for (const fragment of [
			"CREATE TABLE IF NOT EXISTS crm_ai_suggestions",
			"action_type TEXT CHECK(action_type IN ('create_task','update_lead','route_to_human','create_deal','update_deal_stage','send_reply'))",
			"status TEXT CHECK(status IN ('pending','approved','rejected','expired')) NOT NULL DEFAULT 'pending'",
			"CREATE INDEX IF NOT EXISTS idx_crm_ai_suggestions_conversation_status",
			"CREATE INDEX IF NOT EXISTS idx_crm_ai_suggestions_status_created",
		]) {
			assert.match(
				DATABASE_SCHEMA_SQL,
				new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
			);
		}
	});
});

describe("in-memory crm AI suggestions repository", () => {
	it("creates, lists, approves and audits suggestions", async () => {
		const repo = createInMemoryCrmRepository();
		const contact = await repo.createContact({ display_name: "Hot Lead" });
		await repo.setConversationCrmLink({ conversation_id: 44, contact_id: contact.id });

		const suggestion = await repo.createAiSuggestion({
			conversation_id: 44,
			contact_id: contact.id,
			action_type: "create_task",
			payload: { title: "Call lead", priority: "high" },
			confidence: 0.88,
			reason: "Asked for a sales call",
			requires_confirmation: true,
			source: "lead_qualification",
			actor_user_id: 2,
		});

		assert.equal(suggestion.status, "pending");
		assert.equal(suggestion.reason, "Asked for a sales call");

		const pending = await repo.listAiSuggestions({ status: "pending" });
		assert.equal(pending.length, 1);
		assert.equal(pending[0].id, suggestion.id);

		const approved = await repo.updateAiSuggestionStatus(suggestion.id, {
			status: "approved",
			actor_user_id: 9,
			resolution_note: "Accepted by operator",
		});

		assert.equal(approved.status, "approved");
		assert.equal(approved.resolved_by_user_id, 9);
		assert.equal(approved.resolution_note, "Accepted by operator");

		const audits = await repo.listAuditEvents();
		assert.equal(audits.some((item) => item.action === "crm.ai_suggestion_created"), true);
		assert.equal(audits.some((item) => item.action === "crm.ai_suggestion_approved"), true);
	});

	it("builds a contact 360 profile with deals, methods, accounts and AI suggestions", async () => {
		const repo = createInMemoryCrmRepository();
		const account = await repo.createAccount({ name: "Acme" });
		const contact = await repo.createContact({ display_name: "Jane Buyer" });
		await repo.addContactMethod({
			contact_id: contact.id,
			method_type: "email",
			value: "jane@acme.test",
		});
		await repo.linkContactToAccount({ contact_id: contact.id, account_id: account.id });
		await repo.createDeal({
			title: "Annual plan",
			contact_id: contact.id,
			amount: 9000,
			stage: "proposal_sent",
		});
		await repo.createAiSuggestion({
			conversation_id: 101,
			contact_id: contact.id,
			action_type: "create_task",
			payload: { title: "Follow up proposal" },
			reason: "Proposal sent yesterday",
		});

		const profile = await repo.getContact360(contact.id);

		assert.equal(profile?.contact.display_name, "Jane Buyer");
		assert.equal(profile?.methods[0].value, "jane@acme.test");
		assert.equal(profile?.account_links[0].account_id, account.id);
		assert.equal(profile?.deals[0].title, "Annual plan");
		assert.equal(profile?.ai_suggestions[0].action_type, "create_task");
	});
});
