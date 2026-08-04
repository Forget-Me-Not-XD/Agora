# Build context must be the repo root (not apps/backend) — this image needs
# the sibling apps/ml directory too, since predict.py is spawned as a child
# process at runtime (see analytics.service.ts / lstm.service.ts mlDir).
#   docker buildx build --platform linux/arm64 -f apps/backend/Dockerfile -t <tag> .

# ── Build stage ─────────────────────────────────
FROM node:20-bookworm-slim AS builder
WORKDIR /app/apps/backend

COPY apps/backend/package*.json ./
RUN npm ci

COPY apps/backend/tsconfig.json apps/backend/nest-cli.json ./
COPY apps/backend/src ./src
RUN npm run build && find ./dist -name '*.js.map' -delete

# ── Runtime stage ───────────────────────────────
# Debian (glibc), not Alpine (musl): tflite-runtime only ships manylinux/glibc
# wheels, so it cannot be pip-installed on Alpine. Also keeps parity with the
# Pi's own OS (Raspberry Pi OS Bookworm), per apps/ml/README.md.
FROM node:20-bookworm-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 python3-venv python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/apps/backend
COPY apps/backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/apps/backend/dist ./dist

# apps/ml must land as a sibling of apps/backend (../ml from dist/<module>),
# matching the local monorepo layout the path.resolve() calls assume.
WORKDIR /app/apps/ml
COPY apps/ml/predict.py apps/ml/model.tflite apps/ml/scaler.pkl apps/ml/model_meta.json ./
COPY apps/ml/requirements-infer.txt ./
RUN python3 -m venv ./venv \
    && ./venv/bin/pip install --no-cache-dir --upgrade pip \
    && ./venv/bin/pip install --no-cache-dir -r requirements-infer.txt

# analytics.service.ts spawns bare `python` (relies on PATH); lstm.service.ts
# spawns apps/ml/venv/bin/python directly. Putting the venv first on PATH
# satisfies both call sites with a single dependency install.
ENV PATH="/app/apps/ml/venv/bin:${PATH}"

RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -s /bin/false nestjs && \
    chown -R nestjs:nodejs /app
USER nestjs

WORKDIR /app/apps/backend
EXPOSE 3000
CMD ["node", "dist/config/main.js"]
