import Fastify from "fastify";
import { authRoutes } from "./auth/routes.js";

/** Builds the Fastify app (no listen) — easier to test. */
export function buildApp() {
  const app = Fastify({ logger: true });

  app.get("/health", async () => ({ ok: true }));
  // Plugin keeps auth routes out of this file — same pattern later for links.
  app.register(authRoutes);

  return app;
}
