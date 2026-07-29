FROM node:20-bookworm-slim AS build
WORKDIR /app
# prisma.config.ts requires DATABASE_URL at generate time; no DB connection happens here.
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public"
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
# Overridden at runtime by Railway; needed only so `prisma generate` can load config.
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public"
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci --omit=dev && npx prisma generate
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
