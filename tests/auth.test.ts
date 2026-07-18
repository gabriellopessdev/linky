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
    expect(res.json()).toEqual({ accessToken: expect.any(String) });
  });

  test("should reject duplicate email", async () => {
    const email = `test-${crypto.randomUUID()}@example.com`;

    const firstRegister = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email, password: "password" },
    });
    expect(firstRegister.statusCode).toBe(201);
    expect(firstRegister.json()).toEqual({ accessToken: expect.any(String) });

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
    expect(registered.json()).toEqual({ accessToken: expect.any(String) });

    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password },
    });
    expect(login.statusCode).toBe(200);
    expect(login.json()).toEqual({ accessToken: expect.any(String) });
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
