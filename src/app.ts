import Fastify from "fastify";

/** Cria a app Fastify (sem listen) — facilita testes. */
export function buildApp() {
  const app = Fastify({ logger: true });

  app.get("/health", async () => ({ ok: true }));

  return app;
}
