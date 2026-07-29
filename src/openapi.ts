/** Shared OpenAPI/JSON Schema fragments for route docs + Fastify validation. */

export const errorMessageSchema = {
  type: "object",
  properties: {
    message: { type: "string" },
  },
  required: ["message"],
} as const;

export const tokenPairSchema = {
  type: "object",
  properties: {
    accessToken: { type: "string" },
    refreshToken: { type: "string" },
  },
  required: ["accessToken", "refreshToken"],
} as const;

export const linkSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    code: { type: "string" },
    longUrl: { type: "string" },
    clicks: { type: "integer" },
    createdAt: { type: "string", format: "date-time" },
  },
  required: ["id", "code", "longUrl", "clicks", "createdAt"],
} as const;

export const bearerSecurity = [{ bearerAuth: [] }] as const;
