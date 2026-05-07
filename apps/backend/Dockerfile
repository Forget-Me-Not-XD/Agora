# ── Build stage ─────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install build deps
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install --no-audit --no-fund; fi

# Build application
COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ── Runtime stage ───────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Install runtime deps only
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev --no-audit --no-fund; fi && npm cache clean --force

# Copy built app from builder
COPY --from=builder /app/dist ./dist

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app
USER nestjs

EXPOSE 3000

CMD ["node", "dist/config/main.js"]