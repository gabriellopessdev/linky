import { randomBytes } from "node:crypto";

/** ~8 URL-safe chars — enough entropy for MVP codes without a nanoid dependency. */
export function generateLinkCode(): string {
  return randomBytes(6).toString("base64url");
}
