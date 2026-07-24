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
  // UUID email avoids collisions across parallel/repeated test runs.
  const email = `test-${crypto.randomUUID()}@example.com`;
  const res = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { email, password: "password" },
  });
  expect(res.statusCode).toBe(201);
  return res.json() as { accessToken: string; refreshToken: string };
}

function authHeader(accessToken: string) {
  return { authorization: `Bearer ${accessToken}` };
}

describe("POST /links", () => {
  test("should create a link for the authenticated user", async () => {
    const { accessToken } = await registerUser();
    const longUrl = "https://example.com/docs";

    const res = await app.inject({
      method: "POST",
      url: "/links",
      headers: authHeader(accessToken),
      payload: { longUrl },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({
      id: expect.any(String),
      code: expect.any(String),
      longUrl,
      clicks: 0,
      createdAt: expect.any(String),
    });
  });

  test("should reject create without access JWT", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/links",
      payload: { longUrl: "https://example.com" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ message: "Unauthorized" });
  });
});
