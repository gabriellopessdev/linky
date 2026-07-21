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

/** Parses JWT_REFRESH_TTL like `7d` / `12h` / `30m` / `60s`; defaults to 7 days. */
function getRefreshTtlMs(): number {
  const raw = process.env.JWT_REFRESH_TTL ?? "7d";
  const match = /^(\d+)([dhms])$/.exec(raw);
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }
  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * multipliers[unit];
}

/**
 * Persists the hash only; returns the raw token for the client.
 * New familyId per call — reuse of a rotated token will revoke that whole family.
 */
export async function issueRefreshToken(
  userId: string,
  familyId: string = crypto.randomUUID(),
): Promise<string> {
  const rawRefresh = generateRefreshToken();
  const tokenHash = hashRefreshToken(rawRefresh);
  const expiresAt = new Date(Date.now() + getRefreshTtlMs());

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
