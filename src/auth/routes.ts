import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from "./password.js";
import { signAccessToken } from "./jwt.js";

type AuthBody = {
  email: string;
  password: string;
};

/** Register + login only — refresh/logout land in the next auth issue. */
export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (request, reply) => {
    const { email, password } = request.body as AuthBody;
    const passwordHash = await hashPassword(password);

    try {
      const user = await prisma.user.create({
        data: { email, passwordHash },
      });

      const accessToken = await signAccessToken(user.id);
      return reply.code(201).send({ accessToken });
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
    return reply.code(200).send({ accessToken });
  });
}
