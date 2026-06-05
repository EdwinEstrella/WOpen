# Apply Progress: Serious CRM Foundations

## Change

- Change: `serious-crm-foundations`
- Mode: Strict TDD
- Delivery: stacked PR slice (`ask-on-risk` resolved to `stacked-to-main`)
- Current slice: PR 2 auth runtime cutover

## Completed Tasks

- [x] 1.1 RED: add `tests/auth-repository.test.ts` for auth/audit schema and repository boundaries.
- [x] 1.2 GREEN: extend `src/lib/db-contract.ts` schema/types and add `src/lib/repositories/auth-repository.ts`.
- [x] 1.3 GREEN: add `src/lib/auth/password.ts` and `src/lib/auth/bootstrap.ts`.
- [x] 2.1 RED: add `tests/auth-session.test.ts` and `tests/auth-routes.test.ts`.
- [x] 2.2 GREEN: add `src/lib/auth/session.ts`.
- [x] 2.3 GREEN: update auth routes and `src/middleware.ts` to DB sessions.
- [x] 2.4 GREEN: enforce roles in protected API routes.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `tests/auth-repository.test.ts` | Unit | ✅ `tests/db-contract.test.ts` 9/9 passing | ✅ Written first; missing auth modules failed import | ✅ `node --import tsx --test tests/auth-repository.test.ts tests/auth-bootstrap.test.ts` | ✅ schema + in-memory + SQL session cases | ✅ kept repository API narrow |
| 1.2 | `tests/auth-repository.test.ts` | Unit | ✅ `tests/db-contract.test.ts` 9/9 passing | ✅ repository/schema expectations existed before implementation | ✅ auth repository tests 7/7 passing | ✅ in-memory + Postgres query paths | ✅ extracted shared email normalization |
| 1.3 | `tests/auth-bootstrap.test.ts` | Unit | N/A (new files) | ✅ bootstrap/password tests written first | ✅ auth bootstrap tests 7/7 passing | ✅ hash verify + bootstrap create/skip cases | ✅ bootstrap kept as thin orchestration |
| 2.1 | `tests/auth-session.test.ts`, `tests/auth-routes.test.ts` | Unit | ✅ `npm test` 116/116 passing | ✅ written first; missing `src/lib/auth/session.ts` failed import | ✅ `node --import tsx --test tests/auth-session.test.ts tests/auth-routes.test.ts` | ✅ valid/invalid login, revoked/expired sessions, middleware path matrix | ✅ shared request builders kept auth tests focused |
| 2.2 | `tests/auth-session.test.ts` | Unit | ✅ `npm test` 116/116 passing | ✅ session helpers referenced before implementation | ✅ auth session tests 3/3 passing | ✅ active, expired, revoked, and role hierarchy cases | ✅ extracted cookie/token helpers plus auth error mapping |
| 2.3 | `tests/auth-routes.test.ts` | Unit | ✅ `npm test` 116/116 passing | ✅ route factories expected DB session behavior before cutover | ✅ auth route tests 3/3 passing | ✅ login success/failure, logout revoke, API/page gate | ✅ extracted `runtimeSessionDeps` to keep auth route wiring thin |
| 2.4 | `tests/auth-session.test.ts`, `tests/auth-routes.test.ts` | Unit | ✅ `npm test` 116/116 passing | ✅ viewer/manager protection expectations existed before enforcement | ✅ `npm test` and `npx tsc --noEmit` passing after route guard wiring | ✅ viewer, agent, manager thresholds across protected route handlers | ✅ reused shared `requireRequestRole` instead of duplicating checks |

## Test Summary

- Total tests written: 13
- Total tests passing: 122 (`npm test`)
- Layers used: Unit (13), Integration (0), E2E (0)
- Approval tests: None — new auth foundation slice
- Pure functions created: 3 (`hashPassword`, `verifyPassword`, `hashSessionToken`)

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `tests/auth-repository.test.ts` | Created | Added RED coverage for auth schema, repository behavior, and durable session SQL boundaries. |
| `tests/auth-bootstrap.test.ts` | Created | Added password hashing and bootstrap seed tests. |
| `src/lib/db-contract.ts` | Modified | Added auth/audit schema plus row/type exports for the new durable foundation. |
| `src/lib/repositories/auth-repository.ts` | Created | Added isolated auth repository adapters for Postgres and in-memory use. |
| `src/lib/auth/password.ts` | Created | Added scrypt password hashing and verification helpers. |
| `src/lib/auth/bootstrap.ts` | Created | Added first-owner bootstrap flow from admin env inputs. |
| `tests/auth-session.test.ts` | Created | Added RED coverage for durable session lookup, revocation, expiry, and role hierarchy. |
| `tests/auth-routes.test.ts` | Created | Added RED coverage for DB-backed login/logout and middleware gating. |
| `src/lib/auth/session.ts` | Created | Added hashed session issuance, request validation, role checks, and auth error helpers. |
| `src/lib/auth/runtime.ts` | Created | Added schema-safe runtime auth repository wiring for server routes. |
| `src/lib/repositories/auth-repository.ts` | Modified | Added user lookup by id for durable session resolution. |
| `src/app/api/auth/login/route.ts` | Modified | Cut login over to DB credentials plus opaque session cookies. |
| `src/app/api/auth/logout/route.ts` | Modified | Revokes durable sessions and clears the auth cookie. |
| `src/middleware.ts` | Modified | Switched edge gate from env-secret matching to session-cookie presence checks. |
| `src/app/api/conversations/[conversationId]/route.ts` | Modified | Enforced `agent` role for destructive conversation mutations. |
| `src/app/api/tasks/route.ts` | Modified | Enforced `viewer`/`agent` task route access. |
| `src/app/api/tasks/[taskId]/route.ts` | Modified | Enforced `agent` role for task mutations. |
| `src/app/api/settings/route.ts` | Modified | Enforced `viewer` read and `manager` config writes. |
| `src/app/api/prompts/route.ts` | Modified | Enforced `viewer` reads and `manager` prompt changes. |
| `src/app/api/automations/route.ts` | Modified | Enforced `viewer` reads and `manager` automation changes. |
| `src/app/api/instances/route.ts` | Modified | Enforced `viewer` reads and `manager` instance creation. |
| `src/app/api/instances/[instanceId]/route.ts` | Modified | Enforced `manager` role for instance switching and deletion. |
| `openspec/changes/serious-crm-foundations/tasks.md` | Modified | Marked Phase 1 and Phase 2 auth/runtime tasks complete for this slice. |

## Deviations from Design

None — implementation matches the PR 2 auth runtime slice and keeps CRM identity work for PR 3.

## Issues Found

None.

## Remaining Tasks

- [ ] 3.1 RED: add `tests/crm-repository.test.ts`.
- [ ] 3.2 GREEN: extend CRM identity schema.
- [ ] 3.3 GREEN: add CRM repository and audit writes.
- [ ] 4.1 RED: add conversation view/API compatibility tests.
- [ ] 4.2 GREEN: add conversation view service and compatible API payloads.
- [ ] 4.3 REFACTOR/VERIFY: keep full suite + typecheck green.

## Workload / PR Boundary

- Mode: stacked PR slice
- Current work unit: PR 2 auth runtime cutover
- Boundary: durable login/logout/session validation plus minimum protected-route RBAC; no CRM identity or conversation-view work
- Estimated review budget impact: medium, stays under the intended review budget for a chained slice

## Verification

- ✅ `node --import tsx --test tests/db-contract.test.ts`
- ✅ `node --import tsx --test tests/auth-repository.test.ts tests/auth-bootstrap.test.ts`
- ✅ `node --import tsx --test tests/auth-session.test.ts tests/auth-routes.test.ts`
- ✅ `npm test`
- ✅ `npx tsc --noEmit`

## Status

7/10 tasks complete. Ready for next batch.
