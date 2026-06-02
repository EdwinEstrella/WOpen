# Tasks: normalize-whatsapp-turns-followups

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 120-180 lines in `promt.md` |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR: documentation/specification update only |
| Delivery strategy | single-pr |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

## Context and Constraints

- Repository currently has no application source tree, `package.json`, or runnable test runner; verification is by document review and diff until code exists.
- This change should update the prompt/specification document first, especially `promt.md`.
- Do not implement app code, migrations, or tests in this change.
- Keep the `promt.md` documentation update under the 400 changed-line review budget.

## Implementation Tasks

### 1. RED — Build a document-review checklist from accepted specs

- [ ] Create a temporary reviewer checklist from:
  - `openspec/changes/normalize-whatsapp-turns-followups/proposal.md`
  - `openspec/changes/normalize-whatsapp-turns-followups/specs/whatsapp-automation/spec.md`
  - `openspec/changes/normalize-whatsapp-turns-followups/design.md`
  - current `promt.md`
- [ ] Checklist must explicitly fail current `promt.md` for these known conflicts:
  - `promt.md` line/section that filters all `msg.key.fromMe === true` messages.
  - customer-triggered administrative shutdown keywords such as `humano`, `asesor`, or `Ok.`.
  - incomplete `conversations`/`messages` DDL for role/source/timestamp/follow-up decisions.
  - missing durable `settings` and optional audit/event model.
  - missing Redis key conventions/TTL cleanup boundaries.
  - follow-ups lacking active-turn collision checks and 24-hour free-form boundary handling.
  - missing DeepSeek strict JSON fallback behavior.
- [ ] Verification: reviewer can point to each failing current `promt.md` section before any edit is made.

### 2. GREEN — Update `promt.md` objective behavior for owner-only controls

- [ ] In `promt.md`, revise the high-level inbound behavior under `# OBJETIVO FINAL` so administrative bot on/off keywords are owner-only, not customer-triggered.
- [ ] State that owner WhatsApp messages (`fromMe === true`) are persisted as `role='human'` and may toggle per-chat mode only when they exactly match configured owner keywords.
- [ ] State that customer messages matching administrative keywords are normal `user` messages; customer handoff intent remains a separate AI/business decision.
- [ ] Verification: document diff shows no remaining instruction that customer text alone administratively toggles bot mode.

### 3. GREEN — Update PostgreSQL schema and helper contracts in `promt.md`

- [ ] Replace/expand the DDL in `promt.md` for `conversations` with fields for `jid`, `mode_reason`, `mode_changed_at`, `mode_changed_by`, follow-up blocked metadata, source-specific timestamps, owner intervention, and AI reactivation timestamp.
- [ ] Replace/expand the DDL for `messages` with `whatsapp_message_id`, `direction`, `role`, `media_type`, `source`, `from_me`, `raw_timestamp`, `metadata`, and a unique index for WhatsApp message IDs.
- [ ] Add the `settings` table and required defaults for owner keywords, debounce/lock TTLs, follow-up limits, 3-day reactivation, and 24-hour boundary behavior.
- [ ] Add optional `conversation_events` audit table or clearly specify the minimum conversation fields used when audit events are deferred.
- [ ] Update DB helper names/contracts in `promt.md` to include transactional insert/update, settings access, mode changes with reason/actor, recent history, follow-up candidates, attempt increments, and event recording if present.
- [ ] Verification: schema supports every role, timestamp, mode, follow-up, dedupe, and owner reactivation scenario in `spec.md`.

### 4. GREEN — Add Redis transient-state conventions to `promt.md`

- [ ] Add Redis key prefix `wa:v1:` and document keys for:
  - message deduplication by WhatsApp message ID;
  - per-conversation debounce queue;
  - debounce timer marker;
  - processing lock and processing state;
  - global follow-up runner lock;
  - per-conversation follow-up lock.
- [ ] Document TTLs and token-safe release for locks.
- [ ] Document finalization cleanup boundaries: delete transient turn keys only; never delete PostgreSQL history, `./auth/`, Baileys state, or durable conversation mode.
- [ ] Verification: document review can distinguish transient Redis state from durable PostgreSQL state.

### 5. GREEN — Rewrite inbound handler lifecycle in `promt.md`

- [ ] Replace the current `# HANDLER DE MENSAJES ENTRANTES (CON ENCOLAMIENTO)` instructions with the lifecycle from `design.md`:
  - receive/filter valid 1:1 `messages.upsert` notifications;
  - dedupe by WhatsApp message ID before persistence;
  - persist accepted messages before DeepSeek calls;
  - assign `user` vs `human` role correctly;
  - process owner off/on keywords;
  - apply 3-day owner reply reactivation using timestamps captured before the current owner message updates intervention timestamps;
  - skip AI when conversation is `HUMAN`;
  - debounce customer messages in `AI` mode;
  - load recent history and active prompt before DeepSeek;
  - send validated response parts and persist `assistant` messages;
  - handle AI handoff to `HUMAN`;
  - finalize transient state idempotently without touching Baileys auth.
- [ ] Verification: the old blanket `fromMe` filter is removed or explicitly rejected.

### 6. GREEN — Rewrite follow-up scheduler behavior in `promt.md`

- [ ] Update `scripts/followups-cron.ts` specification to match local scheduler parity with `seguimiento.json` while using Baileys/PostgreSQL/Redis/DeepSeek.
- [ ] Document candidate rules:
  - `mode='AI'`;
  - latest visible message is `assistant`;
  - no `user` message after that assistant message;
  - `followup_attempts < 2` or configured max;
  - minimum delay after assistant message;
  - inside 24-hour customer interaction window when blocking is enabled;
  - no active Redis queue/debounce/lock/processing state;
  - follow-up lock acquired.
- [ ] Document strict DeepSeek follow-up JSON contract `{ "respuesta": "SI" | "NO", "mensaje": "..." }` and safe invalid-JSON behavior.
- [ ] Document that user replies reset/cancel follow-up attempts and inbound turns take priority over scheduler sends.
- [ ] Verification: document diff covers all follow-up scenarios in `spec.md`, including collision and 24-hour blocking.

### 7. GREEN — Add DeepSeek contracts and safe fallback rules to `promt.md`

- [ ] Document normal reply JSON contract with `response.part_1..part_3` and optional `handoff.required/reason`.
- [ ] Require strict parsing, validated non-empty string parts, ordered sending, and no raw unvalidated LLM text.
- [ ] Add retry/repair behavior for malformed normal reply JSON and safe handoff fallback if retry fails.
- [ ] Add malformed follow-up JSON behavior: send nothing and record skip/audit.
- [ ] Verification: reviewer can verify both normal replies and follow-ups have explicit parser failure paths.

### 8. TRIANGULATE — Cross-check `promt.md` against OpenSpec requirements

- [ ] Compare the edited `promt.md` against every requirement/scenario in `openspec/changes/normalize-whatsapp-turns-followups/specs/whatsapp-automation/spec.md`.
- [ ] Confirm the document preserves approved stack constraints from `openspec/config.yaml`: Baileys, PostgreSQL via `pg`, Redis via `ioredis`, DeepSeek, local scheduler; no Prisma/Drizzle/Supabase/WebSockets/Vercel/Meta API/Twilio/OpenAI SDK.
- [ ] Confirm migration notes map n8n/Evolution/OpenAI/official WhatsApp API concepts to local components.
- [ ] Verification: maintain a short manual checklist in the PR description or apply notes showing each scenario is covered.

### 9. REFACTOR — Keep the documentation diff reviewable

- [ ] Remove duplicated or contradictory instructions introduced during editing.
- [ ] Keep edits focused on `promt.md`; do not reformat unrelated sections.
- [ ] Confirm changed lines remain below the 400-line review budget; if the diff grows above ~300 changed lines, pause and split or compress before proceeding.
- [ ] Verification: `git diff --stat promt.md` and document review show a focused documentation-only change.

### 10. VERIFY — Manual verification only until code exists

- [ ] Run document-only checks available in the repository:
  - `git diff -- promt.md`
  - `git diff --stat promt.md`
  - grep/search for stale conflicting text: `fromMe === true`, `Palabras clave de apagado`, `seguimiento`, `followup`, `24`, `Redis`, `HUMAN`.
- [ ] Record that no runnable automated tests exist because the repository has no app code/test runner (`openspec/config.yaml` testing runner is `none`).
- [ ] Verify no files outside `promt.md` and OpenSpec phase artifacts were modified for apply.
- [ ] Verification output should explicitly state: "No automated tests run; documentation-only change, verified by diff and OpenSpec scenario checklist."

## Future Code Tasks (deferred until source scaffold exists)

- [ ] Add executable tests before implementation for dedupe, owner keywords, customer keyword non-toggle, 3-day reactivation, follow-up eligibility, Redis collision checks, 24-hour blocking, invalid DeepSeek JSON, and Baileys auth-safe finalization.
- [ ] Implement PostgreSQL schema/helper updates in `src/lib/db.ts`.
- [ ] Implement Redis turn state helpers in `src/lib/redis.ts` or equivalent.
- [ ] Implement owner-aware Baileys inbound handling in `src/lib/baileys/handler.ts`.
- [ ] Implement follow-up scheduler behavior in `scripts/followups-cron.ts`.
- [ ] Add lint/build/test scripts and document their use before SDD verify.
