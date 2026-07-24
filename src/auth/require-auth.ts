import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyAccessToken } from "./jwt.js";

declare module "fastify" {
  interface FastifyRequest {
    /** Set by requireAuth after a valid Bearer access JWT. */
    userId: string;
  }
}

/** Rejects missing/invalid Bearer access JWT with a generic 401. */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  try {
    request.userId = await verifyAccessToken(header.slice("Bearer ".length));
  } catch {
    return reply.code(401).send({ message: "Unauthorized" });
  }
}
