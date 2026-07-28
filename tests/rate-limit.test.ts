import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";

let app: FastifyInstance;

beforeAll(async () => {
  // Low max only in this file — default buildApp() stays loose so the rest of the suite does not 429.
  app = buildApp({ authRateLimitMax: 3 });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("auth rate limit", () => {
  test("should return 429 after too many login attempts", async () => {
    // Invalid login still counts toward the limit without creating users.
    const payload = {
      email: "attacker@example.com",
      password: "wrong-password",
    };

    for (let i = 0; i < 3; i++) {
      const res = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload,
      });
      expect(res.statusCode).toBe(401);
    }

    const limited = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload,
    });
    expect(limited.statusCode).toBe(429);
    // Same public contract as other 4xx: only { message }.
    expect(limited.json()).toEqual({ message: expect.any(String) });
  });
});
