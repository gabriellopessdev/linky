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

describe("GET /:code", () => {
  test("should redirect and increment clicks without JWT", async () => {
    const { accessToken } = await registerUser();
    const longUrl = "https://example.com/redirect-me";

    const created = await app.inject({
      method: "POST",
      url: "/links",
      headers: authHeader(accessToken),
      payload: { longUrl },
    });
    expect(created.statusCode).toBe(201);
    const { code } = created.json() as { code: string };

    // Public hot path: no Authorization header.
    const redirected = await app.inject({
      method: "GET",
      url: `/${code}`,
    });

    expect(redirected.statusCode).toBe(302);
    expect(redirected.headers.location).toBe(longUrl);

    // Same request must have incremented clicks (sync MVP).
    const stats = await app.inject({
      method: "GET",
      url: `/links/${code}/stats`,
      headers: authHeader(accessToken),
    });
    expect(stats.statusCode).toBe(200);
    expect(stats.json()).toMatchObject({ clicks: 1 });
  });
});
