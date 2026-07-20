import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../db.js";

/** Opaque refresh: high-entropy random string the client stores (never put in the DB). */
export function generateRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 hex — enough for high-entropy tokens; we only persist the hash (ADR-003). */
export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Persists the hash only; returns the raw token for the client.
 * New familyId per call — reuse of a rotated token will revoke that whole family.
 */
export async function issueRefreshToken(userId: string): Promise<string> {
  const rawRefresh = generateRefreshToken();
  const tokenHash = hashRefreshToken(rawRefresh);
  const familyId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days (env TTL later)

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      familyId,
      expiresAt,
    },
  });

  return rawRefresh;
}