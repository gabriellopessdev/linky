# Decisions (lightweight ADRs)

Record **why**, not only what. One paragraph + mermaid when it helps.

---

## ADR-001 — Fastify + TypeScript (not Nest)

**Status:** accepted  
**Context:** timeline A (2–3 weeks); junior+ signal with auth, Postgres, tests, deploy.  
**Decision:** Fastify + TS ESM; explicit plugins/routes instead of a full framework (Nest).  
**Consequences:** less ceremony and DI; more hand-written code (great for interviews). Nest stays an option if a future team requires it.  
**Alternatives:** Nest, Hono, plain Express.

---

## ADR-002 — ORM: Prisma (not Drizzle)

**Status:** accepted  
**Context:** Postgres is required for the MVP; need migrations and type-safety without stretching timeline A (2–3 weeks). SQL experience is already on the resume; the market gap is a common Node ORM.  
**Decision:** Prisma Client + Prisma Migrate.  
**Consequences:** schema and migrations versioned in the repo; typed client aligned with what teams use in production. Trade Drizzle’s “SQL-like by hand” style for DX and interview familiarity — SQL skill remains, it does not disappear.  
**Alternatives:** Drizzle (more explicit SQL); raw `pg` (max control, slower for the MVP).

---

## ADR-003 — Short-lived access JWT + opaque rotating refresh

**Status:** accepted (design; implement in weeks 1–2)  
**Context:** production-minded auth without OAuth/2FA in the MVP.  
**Decision:** access ~15 min (JWT); opaque refresh, **hashed** in the DB, **rotated** on every use; logout revokes refresh. `GET /:code` redirect is public.  
**Consequences:** a stolen refresh used once invalidates the chain; a stolen access token lives at most until TTL.  
**Out of MVP:** logout all-devices, OAuth, 2FA (see README → Next steps).

```mermaid
sequenceDiagram
  participant C as Client
  participant API as Linky
  participant DB as Postgres
  C->>API: POST /auth/login
  API->>DB: user + store refresh_hash
  API-->>C: access + refresh
  Note over C,API: access expired
  C->>API: POST /auth/refresh
  API->>DB: validate hash, revoke old, store new
  API-->>C: new access + refresh
```

---

## ADR-004 — Constant-ish login timing (dummy argon2 verify)

**Status:** accepted  
**Context:** Login must not reveal whether an email is registered. A generic 401 message is necessary but not sufficient — skipping `argon2.verify` when the user is missing makes that path faster (timing side channel).  
**Decision:** On every `POST /auth/login`, always run `verifyPassword` against the user's `passwordHash`, or against a fixed dummy argon2 hash when no user exists. Still return a generic 401 when `!user || !valid`.  
**Consequences:** Failed logins for unknown emails cost roughly one argon2 verify (like a wrong password). Slightly more CPU on probes; clearer junior+ security signal. Not a full constant-time guarantee (DB lookup still differs), but closes the obvious verify skip.  
**Alternatives:** Message-only anti-enumeration (weaker); artificial `setTimeout` (jittery, easy to get wrong); CAPTCHA / rate limit only (complementary — issue #5 / roadmap #6).

---

## Template

```markdown
## ADR-00X — Title

**Status:** proposed | accepted | superseded  
**Context:** …  
**Decision:** …  
**Consequences:** …  
**Alternatives:** …  
```
