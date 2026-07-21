import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

/** Seeds a user via the HTTP surface; each call gets a fresh email + token pair. */
async function registerUser() {
  const email = `test-${crypto.randomUUID()}@example.com`;
  const res = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { email, password: "password" },
  });
  expect(res.statusCode).toBe(201);
  return res.json() as { accessToken: string; refreshToken: string };
}

describe("POST /auth/register", () => {
  test("should register a new user", async () => {
    // UUID email avoids collisions across parallel/repeated test runs.
    const email = `test-${crypto.randomUUID()}@example.com`;
    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email, password: "password" },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ accessToken: expect.any(String), refreshToken: expect.any(String) });
  });

  test("should reject duplicate email", async () => {
    const email = `test-${crypto.randomUUID()}@example.com`;

    const firstRegister = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email, password: "password" },
    });
    expect(firstRegister.statusCode).toBe(201);
    expect(firstRegister.json()).toEqual({ accessToken: expect.any(String), refreshToken: expect.any(String) });

    // Second create hits the unique email constraint → 409 (P2002).
    const secondRegister = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email, password: "password" },
    });
    expect(secondRegister.statusCode).toBe(409);
    expect(secondRegister.json()).toEqual({ message: "Email already exists" });
  });
});

describe("POST /auth/login", () => {
  test("should login with valid credentials", async () => {
    const email = `test-${crypto.randomUUID()}@example.com`;
    const password = "password";

    // Seed via register — tests hit the real HTTP surface, not Prisma directly.
    const registered = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email, password },
    });
    expect(registered.statusCode).toBe(201);
    expect(registered.json()).toEqual({ accessToken: expect.any(String), refreshToken: expect.any(String) });

    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password },
    });
    expect(login.statusCode).toBe(200);
    expect(login.json()).toEqual({ accessToken: expect.any(String), refreshToken: expect.any(String) });
  });

  test("should reject invalid credentials", async () => {
    // Unknown email still returns the same generic 401 (no user enumeration).
    const email = `test-${crypto.randomUUID()}@example.com`;
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: "wrong-password" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ message: "Invalid credentials" });
  });

  test("should return 401 for email registered but wrong password", async () => {
    const email = `test-${crypto.randomUUID()}@example.com`;

    const registered = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email, password: "password" },
    });
    expect(registered.statusCode).toBe(201);

    // Same message as unknown email — matches ADR-004 anti-enumeration goal.
    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: "wrong-password" },
    });
    expect(login.statusCode).toBe(401);
    expect(login.json()).toEqual({ message: "Invalid credentials" });
  });
});

describe("POST /auth/refresh", () => {
  test("should rotate refresh and return a new access + refresh pair", async () => {
    const { refreshToken: refreshA } = await registerUser();

    const rotated = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: refreshA },
    });
    expect(rotated.statusCode).toBe(200);
    expect(rotated.json()).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
    const refreshB = rotated.json().refreshToken as string;
    expect(refreshB).not.toBe(refreshA);

    // Happy path: new token still works (do NOT reuse A here — that wipes the family).
    const withB = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: refreshB },
    });
    expect(withB.statusCode).toBe(200);
    expect(withB.json()).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
  });

  test("should reject reuse of an already-rotated refresh (family invalidated)", async () => {
    const { refreshToken: refreshA } = await registerUser();

    const rotated = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: refreshA },
    });
    expect(rotated.statusCode).toBe(200);
    const refreshB = rotated.json().refreshToken as string;

    // Reusing A looks like theft → revoke whole family.
    const reuseA = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: refreshA },
    });
    expect(reuseA.statusCode).toBe(401);
    expect(reuseA.json()).toEqual({ message: "Invalid refresh token" });

    // B dies too — same family.
    const useB = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: refreshB },
    });
    expect(useB.statusCode).toBe(401);
    expect(useB.json()).toEqual({ message: "Invalid refresh token" });
  });
});

describe("POST /auth/logout", () => {
  test("should revoke the refresh token so it cannot refresh again", async () => {
    const { refreshToken } = await registerUser();
    const res = await app.inject({
      method: "POST",
      url: "/auth/logout",
      payload: { refreshToken }
    })

    expect(res.statusCode).toBe(204);

    const res2 = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken },
    })

    expect(res2.statusCode).toBe(401);
    expect(res2.json()).toEqual({ message: "Invalid refresh token" });
  });
});
