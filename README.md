# Linky

API Node/TypeScript que **encurta URL**, **redireciona** e **conta cliques**.

Portfólio **junior+** (backend): auth com JWT + refresh rotativo, Postgres, testes, deploy. Escopo fechado em [`docs/ROADMAP.md`](docs/ROADMAP.md) — o plano-mãe está no template (`docs/PORTFOLIO.md`).

> MVP de propósito. Mentiras úteis (Redis no redirect, clicks async, OAuth…) ficam em **Próximos passos**, não no código da v1.

---

## Stack

| Peça | Escolha |
|------|---------|
| Runtime | Node 20+ |
| Linguagem | TypeScript |
| HTTP | Fastify |
| DB | Postgres + Prisma — [ADR-002](docs/DECISIONS.md) |
| Testes | Vitest |
| Deploy | Railway / Fly / Render (semana 3) |

---

## Rodar local

Requisitos: **Node 20+**, **Docker** (Postgres).

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

### Testes

```bash
npm test
```

---

## Estrutura

```text
src/
  app.ts       # Fastify app (injectável em testes)
  server.ts    # listen
  db.ts        # PrismaClient singleton
prisma/
  schema.prisma
  migrations/
docker-compose.yml
tests/
  health.test.ts
docs/
  ROADMAP.md
  DECISIONS.md
```

---

## API (contrato alvo do MVP)

| Método | Rota | Auth |
|--------|------|------|
| POST | `/auth/register` | — |
| POST | `/auth/login` | — |
| POST | `/auth/refresh` | refresh no body |
| POST | `/auth/logout` | revoga refresh |
| POST | `/links` | access JWT |
| GET | `/links` | access JWT |
| GET | `/links/:code/stats` | access JWT |
| GET | `/:code` | público → 302 |

Hoje: `GET /health` + Postgres/`users` via Prisma. Auth e links ainda no roadmap.

---

## Docs

- [ROADMAP.md](docs/ROADMAP.md) — semanas 1–3  
- [DECISIONS.md](docs/DECISIONS.md) — ADRs  

---

## Próximos passos (README — não no MVP)

| Ideia | Por quê |
|-------|---------|
| Cache Redis no redirect | Latência do hot path `GET /:code` |
| Contador de cliques assíncrono | Não bloquear redirect em write no DB |
| Logout em todos os devices | Segurança / rotação forçada de refresh |
| OAuth / 2FA | Onboarding e hardening de conta |
| Analytics ricos (geo/device) | Produto; fora do sinal junior+ do MVP |
