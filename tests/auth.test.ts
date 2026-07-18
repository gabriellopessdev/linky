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
    const email = `test-${Date.now()}@example.com`;
    const password = "password";
    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      body: { email, password },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ accessToken: expect.any(String) });
  });
});
