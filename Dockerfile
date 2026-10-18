# ---- deps ----
FROM node:22-slim AS deps
WORKDIR /app
# Use a fast mirror to avoid registry timeouts during build (同 Dockerfile.mcp)
ARG NPM_REGISTRY=http://mirrors.cloud.tencent.com/npm/
COPY package.json package-lock.json ./
RUN npm config set registry "$NPM_REGISTRY" && npm ci

# ---- builder ----
FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN DATABASE_URL="mysql://placeholder:placeholder@localhost:3306/placeholder" npx prisma generate
RUN npm run build

# ---- runner ----
FROM node:22-slim AS runner
WORKDIR /app

# Python + extract-msg
# deb.debian.org 的 Fastly 部分边缘节点从本机 Docker VM 不可达，切国内镜像
RUN sed -i 's|http://deb.debian.org|http://mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list.d/debian.sources \
  && apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=8913

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/prisma ./prisma
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma

# Python venv
RUN python3 -m venv .venv && .venv/bin/pip install --no-cache-dir -r scripts/requirements.txt

EXPOSE 8913

CMD ["node", "server.js"]
