# ── Stage 1: build ────────────────────────────────────────────────
FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# ── Stage 2: serve ────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Remove default nginx site config
RUN rm /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

# Minimal nginx config: serve static files, route all paths to index.html
COPY nginx.conf /etc/nginx/conf.d/app.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
