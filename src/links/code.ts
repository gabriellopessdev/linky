import { randomBytes } from "node:crypto";

export function generateLinkCode(): string {
  return randomBytes(6).toString('base64url');
}
