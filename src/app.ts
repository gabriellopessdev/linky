import Fastify, { type FastifyError } from "fastify";
import { authRoutes } from "./auth/routes.js";
import { linkRoutes } from "./links/routes.js";
import { redirectRoutes } from "./links/redirect.js";

/** Builds the Fastify app (no listen) — easier to test. */
export function buildApp() {
  const app = Fastify({ logger: true });

  // Unknown routes skip setErrorHandler — normalize here to the same { message } body.
  app.setNotFoundHandler((_, reply) => {
    return reply.code(404).send({ message: "Not Found" });
  });

  // Public contract: only { message }. 5xx never forward Error.message / stack to clients.
  app.setErrorHandler<FastifyError>((error, request, reply) => {
    const statusCode =
      typeof error.statusCode === "number" ? error.statusCode : 500;

    if (statusCode >= 500) {
      request.log.error(error);
      return reply.code(500).send({ message: "Internal Server Error" });
    }

    return reply
      .code(statusCode)
      .send({ message: error.message || "Bad Request" });
  });

  app.get("/health", async () => ({ ok: true }));
  // Plugins keep domain routes out of this file.
  app.register(authRoutes);
  app.register(linkRoutes);
  // Public GET /:code — separate from linkRoutes so requireAuth does not apply.
  app.register(redirectRoutes);

  return app;
}
