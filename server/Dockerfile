# ─── Stage 1: build ──────────────────────────────────────────────────────────
FROM public.ecr.aws/docker/library/node:22-alpine AS build
WORKDIR /app

# Install deps (including dev deps needed for tsc)
COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
RUN npm ci --workspace=server --include-workspace-root=false --ignore-scripts

# Compile TypeScript
COPY server/tsconfig.json ./server/tsconfig.json
COPY server/src ./server/src
RUN npm run build --workspace=server

# Drop dev deps so we copy a lean node_modules to the runtime stage
RUN npm prune --workspace=server --include-workspace-root=false --omit=dev --ignore-scripts \
    && mkdir -p /app/server/node_modules

# ─── Stage 2: runtime ────────────────────────────────────────────────────────
FROM public.ecr.aws/docker/library/node:22-alpine AS runtime
WORKDIR /app/server

ENV NODE_ENV=production
ENV PORT=3001

# Run as non-root for a smaller blast radius
RUN addgroup -S smewise && adduser -S smewise -G smewise

COPY --from=build --chown=smewise:smewise /app/node_modules /app/node_modules
COPY --from=build --chown=smewise:smewise /app/server/node_modules ./node_modules
COPY --from=build --chown=smewise:smewise /app/server/dist ./dist
COPY --chown=smewise:smewise server/package.json ./

USER smewise

EXPOSE 3001

# Simple healthcheck that hits /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["node", "dist/index.js"]
