import argon2 from "argon2";

/** Dummy argon2 hash for login when the user is missing — keeps verify timing similar. */
export const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$eJ9F0uxODI2gG/IVvSF0YQ$jA2Z+hPk4rycZzz+EcKt69UwKgRJkzNDv6xULO4FSck";

/** One-way hash — never store or log the plaintext password. */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

/** Constant-time verify via argon2; returns false on mismatch (no detail leaked). */
export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  return argon2.verify(passwordHash, password);
}
