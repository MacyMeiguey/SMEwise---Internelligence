# syntax=docker/dockerfile:1.6

# ─── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Install deps (including dev deps needed for tsc)
COPY package*.json ./
RUN npm ci

# Compile TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Drop dev deps so we copy a lean node_modules to the runtime stage
RUN npm prune --omit=dev

# ─── Stage 2: runtime ────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Run as non-root for a smaller blast radius
RUN addgroup -S smewise && adduser -S smewise -G smewise

COPY --from=build --chown=smewise:smewise /app/node_modules ./node_modules
COPY --from=build --chown=smewise:smewise /app/dist ./dist
COPY --chown=smewise:smewise package.json ./

USER smewise

EXPOSE 3001

# Simple healthcheck that hits /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["node", "dist/index.js"]
