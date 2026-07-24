import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { requireAuth } from "../auth/require-auth.js";
import { generateLinkCode } from "./code.js";

type CreateLinkBody = {
  longUrl: string;
};

/** Authenticated link routes — ownership always comes from request.userId. */
export async function linkRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.post("/links", async (request, reply) => {
    const { longUrl } = request.body as CreateLinkBody;
    if (typeof longUrl !== "string" || longUrl.length === 0) {
      return reply.code(400).send({ message: "longUrl is required" });
    }

    // Rare unique collision on code → retry a few times instead of failing the request.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const link = await prisma.link.create({
          data: {
            code: generateLinkCode(),
            longUrl,
            userId: request.userId,
          },
        });

        return reply.code(201).send({
          id: link.id,
          code: link.code,
          longUrl: link.longUrl,
          clicks: link.clicks,
          createdAt: link.createdAt.toISOString(),
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          continue;
        }
        throw error;
      }
    }

    return reply.code(500).send({ message: "Could not allocate a unique code" });
  });
}
