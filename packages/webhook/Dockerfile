# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace manifests first (layer caching)
COPY package.json ./
COPY tsconfig.base.json ./
COPY shared/package.json ./shared/
COPY packages/webhook/package.json ./packages/webhook/
COPY packages/ai-engine/package.json ./packages/ai-engine/
COPY packages/momo/package.json ./packages/momo/

RUN npm install --workspace=packages/webhook \
                --workspace=packages/ai-engine \
                --workspace=packages/momo \
                --workspace=shared \
                --ignore-scripts

# Copy source
COPY shared/ ./shared/
COPY packages/ai-engine/ ./packages/ai-engine/
COPY packages/momo/ ./packages/momo/
COPY packages/webhook/ ./packages/webhook/

# Build all packages in dependency order
RUN npm run build --workspace=shared && \
    npm run build --workspace=packages/ai-engine && \
    npm run build --workspace=packages/momo && \
    npm run build --workspace=packages/webhook

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY package.json ./
COPY tsconfig.base.json ./
COPY shared/package.json ./shared/
COPY packages/webhook/package.json ./packages/webhook/
COPY packages/ai-engine/package.json ./packages/ai-engine/
COPY packages/momo/package.json ./packages/momo/

RUN npm install --workspace=packages/webhook \
                --workspace=packages/ai-engine \
                --workspace=packages/momo \
                --workspace=shared \
                --omit=dev \
                --ignore-scripts

# Copy built dist from builder
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/packages/ai-engine/dist ./packages/ai-engine/dist
COPY --from=builder /app/packages/momo/dist ./packages/momo/dist
COPY --from=builder /app/packages/webhook/dist ./packages/webhook/dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "packages/webhook/dist/index.js"]
