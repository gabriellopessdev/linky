import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = buildApp();
  // Test-only route: throws on purpose so we can assert 500 bodies never leak details.
  app.get("/__boom", async () => {
    throw new Error("super secret internal detail");
  });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("errors", () => {
  test("should return 404 for unknown routes", async () => {
    // Multi-segment path: a single segment would match public GET /:code instead.
    const res = await app.inject({
      method: "GET",
      url: "/no-such/route",
    });
    expect(res.statusCode).toBe(404);
    // Public contract: only { message } — no Fastify default error/statusCode keys.
    expect(res.json()).toEqual({ message: expect.any(String) });
  });

  test("should return 500 for internal errors", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/__boom",
    });
    expect(res.statusCode).toBe(500);
    // Generic message only — never forward Error.message / stack to the client.
    expect(res.json()).toEqual({ message: "Internal Server Error" });
    expect(res.body).not.toContain("super secret");
  });
});
