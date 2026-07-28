import { buildApp } from "./app.js";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

// Light auth cap for production; tests omit this option so inject traffic stays unlimited.
const app = buildApp({ authRateLimitMax: 20 });

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
