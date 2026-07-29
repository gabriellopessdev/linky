import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { errorMessageSchema } from "../openapi.js";

/** Public hot path — no JWT. Must stay outside linkRoutes (requireAuth). */
export async function redirectRoutes(app: FastifyInstance) {
  app.get<{ Params: { code: string } }>(
    "/:code",
    {
      schema: {
        tags: ["redirect"],
        summary: "Redirect to the long URL and increment clicks",
        params: {
          type: "object",
          required: ["code"],
          properties: {
            code: { type: "string" },
          },
        },
        response: {
          302: {
            type: "null",
            description: "Found — Location header points to longUrl",
          },
          404: errorMessageSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        // One DB round-trip: update returns the row (Postgres RETURNING via Prisma).
        // Sync clicks++ on the same request — Redis/async stay in README Next steps.
        const link = await prisma.link.update({
          where: { code: request.params.code },
          data: { clicks: { increment: 1 } },
        });
        return reply.redirect(link.longUrl, 302);
      } catch (error) {
        // Missing code → P2025 (update does not return null).
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2025"
        ) {
          return reply.code(404).send({ message: "Link not found" });
        }
        throw error;
      }
    }
  );
}
