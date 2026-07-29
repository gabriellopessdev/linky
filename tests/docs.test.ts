import { afterAll, beforeAll, expect, test } from "vitest";
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

test("GET /docs serves the Swagger UI", async () => {
  const res = await app.inject({ method: "GET", url: "/docs" });
  expect(res.statusCode).toBe(200);
  expect(res.headers["content-type"]).toMatch(/text\/html/);
  expect(res.body).toMatch(/swagger/i);
});
