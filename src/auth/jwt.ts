import { SignJWT } from "jose";

/** Encodes the shared secret for HS256 — jose expects bytes, not a raw string. */
function getAccessSecret(): Uint8Array {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

/** Short TTL keeps a stolen access token useful for only a few minutes (ADR-003). */
function getAccessTtl(): string {
  return process.env.JWT_ACCESS_TTL ?? "15m";
}

/**
 * Issues an access JWT. Only `sub` (user id) — refresh tokens belong to the next issue.
 */
export async function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(getAccessTtl())
    .sign(getAccessSecret());
}
