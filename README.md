# Linky

Node/TypeScript API that **shortens URLs**, **redirects**, and **counts clicks**.

**Junior+** backend portfolio: JWT auth + rotating refresh, Postgres, tests, deploy. Scope is locked in [`docs/ROADMAP.md`](docs/ROADMAP.md).

> Intentional MVP. Useful lies (Redis on redirect, async clicks, OAuth…) live under **Next steps**, not in v1 code.

---

## Stack

| Piece | Choice |
|-------|--------|
| Runtime | Node 20+ |
| Language | TypeScript |
| HTTP | Fastify |
| DB | Postgres + Prisma — [ADR-002](docs/DECISIONS.md) |
| Auth | argon2 + jose (access JWT) — [ADR-003](docs/DECISIONS.md), [ADR-004](docs/DECISIONS.md) |
| Tests | Vitest |
| Deploy | Railway / Fly / Render (week 3) |

---

## Run locally

Requirements: **Node 20+**, **Docker** (Postgres).

```bash
cd linky
cp .env.example .env
docker compose up -d
npm install
npm run db:migrate
npm run dev
```

Health check:

```bash
curl http://localhost:3000/health
# → {"ok":true}
```

### Tests

```bash
npm test
```

---

## Structure

```text
src/
  app.ts            # Fastify app (injectable in tests)
  server.ts         # listen
  db.ts             # PrismaClient singleton
  auth/
    password.ts     # argon2 hash / verify
    jwt.ts          # short-lived access JWT
    routes.ts       # POST /auth/register + /auth/login
prisma/
  schema.prisma
  migrations/
docker-compose.yml
tests/
  health.test.ts
  auth.test.ts
docs/
  ROADMAP.md
  DECISIONS.md
```

---

## API (MVP target contract)

| Method | Route | Auth |
|--------|-------|------|
| POST | `/auth/register` | — |
| POST | `/auth/login` | — |
| POST | `/auth/refresh` | refresh in body |
| POST | `/auth/logout` | revokes refresh |
| POST | `/links` | access JWT |
| GET | `/links` | access JWT |
| GET | `/links/:code/stats` | access JWT |
| GET | `/:code` | public → 302 |

Today: `GET /health` + `POST /auth/register` + `POST /auth/login` (access JWT). Refresh/logout and links are still on the roadmap.

---

## Docs

- [ROADMAP.md](docs/ROADMAP.md) — weeks 1–3  
- [DECISIONS.md](docs/DECISIONS.md) — ADRs  

---

## Next steps (README — not in MVP)

| Idea | Why |
|------|-----|
| Redis cache on redirect | Latency on the `GET /:code` hot path |
| Async click counter | Don't block redirect on a DB write |
| Logout all devices | Security / forced refresh rotation |
| OAuth / 2FA | Onboarding and account hardening |
| Rich analytics (geo/device) | Product; outside the junior+ MVP signal |
