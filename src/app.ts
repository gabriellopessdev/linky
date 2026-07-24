import Fastify from "fastify";
import { authRoutes } from "./auth/routes.js";
import { linkRoutes } from "./links/routes.js";

/** Builds the Fastify app (no listen) — easier to test. */
export function buildApp() {
  const app = Fastify({ logger: true });

  app.get("/health", async () => ({ ok: true }));
  // Plugins keep domain routes out of this file.
  app.register(authRoutes);
  app.register(linkRoutes);

  return app;
}
