import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from "./password.js";
import { signAccessToken } from "./jwt.js";
import { hashRefreshToken, issueRefreshToken } from "./refresh.js";

type AuthBody = {
  email: string;
  password: string;
};

/** Auth routes: register/login issue tokens; refresh rotates; logout revokes (ADR-003). */
export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (request, reply) => {
    const { email, password } = request.body as AuthBody;
    const passwordHash = await hashPassword(password);

    try {
      const user = await prisma.user.create({
        data: { email, passwordHash },
      });

      const accessToken = await signAccessToken(user.id);
      const refreshToken = await issueRefreshToken(user.id);
      return reply.code(201).send({ accessToken, refreshToken });
    } catch (error) {
      // Unique constraint on email — same outcome whether race or plain duplicate.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return reply.code(409).send({ message: "Email already exists" });
      }
      throw error;
    }
  });

  app.post("/auth/login", async (request, reply) => {
    const { email, password } = request.body as AuthBody;

    const user = await prisma.user.findUnique({ where: { email } });
    // Always verify against a real argon2 hash so missing users cost ~the same as bad passwords.
    const hashToCheck = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const valid = await verifyPassword(hashToCheck, password);

    if (!user || !valid) {
      return reply.code(401).send({ message: "Invalid credentials" });
    }

    const accessToken = await signAccessToken(user.id);
    const refreshToken = await issueRefreshToken(user.id);
    return reply.code(200).send({ accessToken, refreshToken });
  });

  app.post("/auth/refresh", async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };

    const tokenHash = hashRefreshToken(refreshToken);
    const stored = await prisma.refreshToken.findFirst({ where: { tokenHash } });

    if (!stored || stored.expiresAt < new Date()) {
      return reply.code(401).send({ message: "Invalid refresh token" });
    }

    if (stored.revokedAt) {
      await prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return reply.code(401).send({ message: "Invalid refresh token" });
    }

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const accessToken = await signAccessToken(stored.userId);
    const newRefreshToken = await issueRefreshToken(stored.userId, stored.familyId);
    return reply.code(200).send({ accessToken, refreshToken: newRefreshToken });
  });

  // Idempotent: unknown/already-revoked token still returns success (no enumeration).
  app.post("/auth/logout", async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };
    const tokenHash = hashRefreshToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return reply.code(204).send();
  });
}
