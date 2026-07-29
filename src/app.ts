import Fastify, { type FastifyError } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { authRoutes } from "./auth/routes.js";
import { linkRoutes } from "./links/routes.js";
import { redirectRoutes } from "./links/redirect.js";

/**
 * Builds the Fastify app (no listen) — easier to test.
 * Pass `authRateLimitMax` to enable a light per-IP cap on auth routes (server + rate-limit test).
 */
export function buildApp(options: { authRateLimitMax?: number } = {}) {
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

  // Spec first, UI second, routes after — so OpenAPI collects every path (incl. Bearer scheme for later schemas).
  app.register(swagger, {
    openapi: {
      openapi: "3.0.0",
      info: {
        title: "Linky",
        description: "URL shortener API",
        version: "0.1.0",
      },
      tags: [
        { name: "health", description: "Liveness" },
        { name: "auth", description: "Register, login, refresh, logout" },
        { name: "links", description: "Authenticated short links" },
        { name: "redirect", description: "Public redirect + click counter" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });
  app.register(swaggerUi, {
    routePrefix: "/docs",
  });

  app.get(
    "/health",
    {
      schema: {
        tags: ["health"],
        summary: "Liveness check",
        response: {
          200: {
            type: "object",
            properties: { ok: { type: "boolean" } },
            required: ["ok"],
          },
        },
      },
    },
    async () => ({ ok: true })
  );
  // Plugins keep domain routes out of this file.
  app.register(authRoutes, {
    authRateLimitMax: options.authRateLimitMax,
  });
  app.register(linkRoutes);
  // Public GET /:code — separate from linkRoutes so requireAuth does not apply.
  app.register(redirectRoutes);

  return app;
}
