# Linky

Node/TypeScript API that **shortens URLs**, **redirects**, and **counts clicks**.

Auth with short-lived access JWT + rotating opaque refresh, Postgres, Vitest, and a public deploy. Intentional MVP — useful lies (Redis on redirect, async clicks, OAuth…) live under **Next steps**, not in v1 code.

---

## Stack

| Piece | Choice |
|-------|--------|
| Runtime | Node 20+ |
| Language | TypeScript |
| HTTP | Fastify |
| DB | Postgres + Prisma — [ADR-002](docs/DECISIONS.md) |
| Auth | argon2 + jose (access JWT) — [ADR-003](docs/DECISIONS.md), [ADR-004](docs/DECISIONS.md) |
| Lint | ESLint (flat config) + typescript-eslint |
| Tests | Vitest |
| CI | GitHub Actions (`lint` + `typecheck` + `test` + Postgres) |
| Deploy | Railway / Fly / Render |

---

## Run locally

Requirements: **Node 20+**, **Docker** (Postgres).

```bash
git clone https://github.com/gabriellopessdev/linky.git
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

### Happy path

```bash
# register
curl -s -X POST http://localhost:3000/auth/register \
  -H "content-type: application/json" \
  -d '{"email":"you@example.com","password":"secret123"}'
# → {"accessToken":"...","refreshToken":"..."}

# login (or reuse tokens from register)
curl -s -X POST http://localhost:3000/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"you@example.com","password":"secret123"}'

# create link — replace <ACCESS_TOKEN>
curl -s -X POST http://localhost:3000/links \
  -H "content-type: application/json" \
  -H "authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"longUrl":"https://example.com"}'
# → {"id":"...","code":"...","longUrl":"https://example.com","clicks":0,...}

# public redirect — replace <CODE>
curl -sI http://localhost:3000/<CODE>
# → HTTP/1.1 302 … Location: https://example.com
```

### Lint & tests

```bash
npm run lint
npm run typecheck
npm test
```

PRs run the same checks on GitHub Actions (Postgres service + Prisma migrate).

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
    require-auth.ts # Bearer access JWT guard
    routes.ts       # POST /auth/register|login|refresh|logout
  links/
    code.ts         # auto short-code generator
    routes.ts       # POST|GET /links + stats (JWT)
    redirect.ts     # public GET /:code → 302 + clicks++
prisma/
  schema.prisma
  migrations/
.github/workflows/
  ci.yml
docker-compose.yml
eslint.config.js
tests/
  health.test.ts
  auth.test.ts
  links.test.ts
  redirect.test.ts
  errors.test.ts
  rate-limit.test.ts
docs/
  DECISIONS.md
```

---

## API

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

Errors always return `{ message }` only (no internal leaks). Auth routes have a light rate limit in production.

---

## Docs

- [DECISIONS.md](docs/DECISIONS.md) — ADRs

---

## Next steps (not in MVP)

| Idea | Why |
|------|-----|
| Redis cache on redirect | Latency on the `GET /:code` hot path |
| Async click counter | Don't block redirect on a DB write |
| Logout all devices | Security / forced refresh rotation |
| OAuth / 2FA | Onboarding and account hardening |
| Rich analytics (geo/device) | Product; outside this MVP |
