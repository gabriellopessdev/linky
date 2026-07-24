import { SignJWT, jwtVerify } from "jose";

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
 * Issues an access JWT. Claims stay minimal: only `sub` (user id).
 */
export async function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(getAccessTtl())
    .sign(getAccessSecret());
}

/** Returns `sub` (user id) from a valid access JWT, or throws if invalid/expired. */
export async function verifyAccessToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, getAccessSecret(), {
    algorithms: ["HS256"],
  });

  if (typeof payload.sub !== "string") {
    throw new Error("Invalid access token subject");
  }
  return payload.sub;
}
