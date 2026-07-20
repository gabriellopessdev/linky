import { createHash, randomBytes } from "node:crypto";

/** Opaque refresh: high-entropy random string the client stores (never put in the DB). */
export function generateRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 hex — enough for high-entropy tokens; we only persist the hash (ADR-003). */
export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
