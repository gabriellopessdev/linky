import Fastify from "fastify";

/** Builds the Fastify app (no listen) — easier to test. */
export function buildApp() {
  const app = Fastify({ logger: true });

  app.get("/health", async () => ({ ok: true }));

  return app;
}
