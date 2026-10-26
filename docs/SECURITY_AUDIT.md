# Security audit

Reviewed: 2026-09-29. This is a source review, not a penetration test or compliance assessment. Exploit execution and deployed exposure are **unverified**. No dependency advisory scan was run; dependency vulnerability status is **unverified**.

## Existing controls

- JWT verification pins HS256 and issuer, checks expiry, and reloads user status, roles and active memberships from the database.
- Passwords use bcrypt cost 10. Unknown-user login performs a dummy comparison. Reset tokens are random, hashed, expiring and conditionally claimed once in a transaction.
- Zod validation, route permissions and service ownership/tenant checks exist, with negative authorization tests.
- Helmet, explicit CORS origins, JSON size limit, request IDs and generic unexpected production errors are configured.
- Operational raw SQL uses tagged parameterization. Seed truncation dynamically quotes database-derived table names; destructive scope is the confirmed risk, not user-controlled SQL injection.
- Cart/order locks, conditional stock updates, and SQL constraints protect several transaction invariants.

## Findings

### S01 — P0: production can disclose password-reset tokens

`requestPasswordReset` in [auth.service.ts](../apps/api/src/modules/auth/auth.service.ts) returns `demoResetToken` based only on `DEMO_MODE`. [env.ts](../apps/api/src/config/env.ts) enables demo behavior by default and only rejects the development JWT secret in production. The reset flow does not use the stronger `devToolsEnabled` gate.

If demo mode is enabled, an anonymous caller supplying an active account's email can receive a token usable to change its password. The code path is confirmed; deployed exposure is **unverified**.

**Acceptance:** production never returns tokens, even with demo configuration enabled; private reset delivery works and a regression test covers the configuration combination.

### S02 — P0: shared password fallbacks and demo account exposure

`createStaff` in [organization-me.service.ts](../apps/api/src/modules/organizations/organization-me.service.ts) and `createEmployee` in [admin.service.ts](../apps/api/src/modules/admin/admin.service.ts) fall back to shared `DEMO_PASSWORD`. Neither has a production/demo guard. Seeded users also share a credential. [demo.routes.ts](../apps/api/src/modules/demo/demo.routes.ts) serves demo identities gated only by `DEMO_MODE`; shared demo constants also ship to the browser.

Accounts created without an explicit password use a publicly known credential. Hiding the demo panel or changing the JWT secret does not fix this.

**Acceptance:** private invitation/setup flow replaces fallback passwords; production rejects demo fixtures/accounts; omitted-password creation is tested. Credential values are omitted here.

### S03 — P1: global administrator permissions cross membership boundaries

[auth-context.service.ts](../apps/api/src/services/auth-context.service.ts) unions permissions from all roles. Organization routes check those permissions. `membershipFor` in [organization-me.service.ts](../apps/api/src/modules/organizations/organization-me.service.ts) checks target membership/type, but write methods do not require that target membership's `staffRole` be `ADMIN`.

A user who is admin in A and ordinary staff in B can pass global admin permission checks while selecting B. The mismatch is confirmed in source; end-to-end exploitation is **unverified**. Approval status is also not consistently checked by this helper.

**Acceptance:** write privileges are checked on the selected membership; negative API tests cover mixed memberships, deactivation and pending entities.

### S04 — P1: no session revocation; token stored in localStorage

[auth.service.ts](../apps/api/src/modules/auth/auth.service.ts) logout only logs activity; password reset does not invalidate existing JWTs. [auth-store.ts](../apps/web/src/store/auth-store.ts) persists the bearer token in localStorage. Deactivation is enforced on subsequent requests, but ordinary logout/reset leaves copied tokens valid until expiry.

**Acceptance:** revocable sessions and credential-change invalidation, tested after logout/reset. Decide storage and cross-site protections together. No XSS exploit was demonstrated; XSS exploitability is **unverified**.

### S05 — P1: authentication lacks application rate limits

[app.ts](../apps/api/src/app.ts) and auth routes contain no limiter, attempt counter or lockout. Reset inserts token rows; signup/login consume hashing work. External proxy protection is **unverified**.

**Acceptance:** bounded account/origin throttling, abuse logging and tests, with generic recovery responses.

### S06 — P1: prescription fulfillment checks are incomplete

[cart.service.ts](../apps/api/src/modules/cart/cart.service.ts) and [orders.service.ts](../apps/api/src/modules/orders/orders.service.ts) require issued, owned prescriptions covering medicines. **Partly fixed 2026-10-26:** checkout now rejects prescriptions past `validUntil` (IST date) and caps each prescription medicine at its prescribed quantity, counting earlier orders on the same prescription unless cancelled/rejected. Refill rules (multiple fills of the prescribed quantity) are not modelled.

**Acceptance:** agree the rules, enforce them transactionally and test expired/repeated fulfillment. Regulatory sufficiency is **unverified**; this finding concerns code invariants.

### S07 — P1: seed/test targets lack robust destructive-operation guards

[seed/index.ts](../apps/api/src/demo/seed/index.ts) truncates all non-migration tables in the selected schema. CLI seed does not refuse production. [test-env.ts](../apps/api/tests/test-env.ts) accepts `TEST_DATABASE_URL` without checking that the target is disposable. HTTP reset has permission/development guards, but its mutex is process-local.

**Acceptance:** separate production reference-data initialization from fixtures; reject non-disposable test/reset targets before mutation. Do not seed merely because migrations succeeded.

### S08 — P1: logging and session cache cleanup need privacy controls

[request-logger.ts](../apps/api/src/middleware/request-logger.ts) records `req.originalUrl`, including free-text query parameters, without explicit redaction. [client.ts](../apps/web/src/api/client.ts) clears auth on 401; only explicit logout clears the query cache. Login invalidates rather than clears cached data; several protected keys lack user identity.

Sensitive search terms can enter logs. Transient prior-user cached-data display on account switching is a plausible risk; browser reproduction is **unverified**.

**Acceptance:** redaction/retention rules and cache partitioning or clearing on all session changes; test expiry followed by login as another patient.

### S09 — P1: broad clinical access and incomplete audit coverage

Consultation/prescription services allow platform roles and involved organization staff as well as patient/treating doctor. Some organization/profile mutations lack activity entries. No read-access audit, retention engine, database RLS or tamper-evident audit sink was found.

**Acceptance:** agree the production least-privilege policy, scope clinical access by purpose, and test/audit it. Whether each broad access is intended is **unverified**.

## Remaining verification

Dependency advisories, deployed TLS/storage encryption, secret management, SPA hosting headers, backups, operational access, recovery drills, provider credential verification and applicable legal requirements are **unverified**. Assess these against a concrete deployment. See [TECH_DEBT_AND_TODO](TECH_DEBT_AND_TODO.md).
