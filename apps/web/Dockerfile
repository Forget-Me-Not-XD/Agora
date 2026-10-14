# Build context must be the repo root:
#   docker buildx build --platform linux/arm64 -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_API_URL=https://api.<domain> -t <tag> .

# ── Build stage ─────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app/apps/web

COPY apps/web/package*.json ./
RUN npm ci

COPY apps/web/ ./

# NEXT_PUBLIC_* is inlined into the JS bundle at build time, not read at
# container runtime — this must be the real public API URL.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build

# ── Runtime stage ───────────────────────────────
# `output: 'standalone'` (next.config.js) traces only the deps actually used
# and bundles them into .next/standalone, so the runtime image doesn't need
# a full npm install.
FROM node:20-alpine AS runner
WORKDIR /app/apps/web
ENV NODE_ENV=production

# Die bladsye word op die bediener gebou, en die datum-helpers (getHours, getDate) gebruik die
# proses se tydsone. Sonder TZ is dit UTC: 'n geleentheid om 14:00 sou as 12:00 wys, en tussen
# middernag en 02:00 sou "vandag" en "môre" een dag mis wees. tzdata gee Alpine die sone-data.
RUN apk add --no-cache tzdata
ENV TZ=Africa/Johannesburg

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static
COPY --chown=nextjs:nodejs apps/web/server-wrapper.js ./server-wrapper.js

USER nextjs
EXPOSE 3001
ENV PORT=3001
CMD ["node", "server-wrapper.js"]
