# syntax=docker/dockerfile:1
# =============================================================================
# movie-finder-frontend — multi-stage build (dev + production)
#
# Targets:
#   dev      Local Docker-only development image used by docker-compose.yml
#   deps     Install npm dependencies with BuildKit cache mount
#   builder  Compile the Angular app for production
#   runner   Minimal nginx:alpine image — production delivery
#
# Build:
#   docker build -t movie-finder-frontend .
#
# Run (local):
#   docker run -p 80:80 \
#     -e BACKEND_URL=http://localhost:8000 \
#     movie-finder-frontend
# =============================================================================

# ── Stage 0: dev ─────────────────────────────────────────────────────────────
# Used by `docker-compose.yml` and VS Code "Attach to Running Container".
FROM node:22-alpine AS dev

RUN apk add --no-cache \
    git \
    make \
    python3 \
    py3-pip \
    && pip install pre-commit --break-system-packages --quiet

# Upgrade npm to match the version declared in packageManager (npm@11.8.0).
RUN npm install -g npm@11.8.0 --prefer-offline 2>/dev/null

WORKDIR /workspace

# Reset entrypoint from parent node image
ENTRYPOINT []

# Keep container alive for fast exec commands
CMD ["sleep", "infinity"]

# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json ./

# Upgrade npm to match the version declared in packageManager (npm@11.8.0).
# The cache mount keeps the download off the image layer.
RUN --mount=type=cache,target=/root/.npm \
    npm install -g npm@11.8.0 --prefer-offline && \
    npm ci --prefer-offline

# ── Stage 2: build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy installed node_modules from deps stage (avoids re-downloading)
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx ng build --configuration=production

# ── Stage 3: serve ───────────────────────────────────────────────────────────
FROM nginx:stable-alpine AS runner

LABEL org.opencontainers.image.title="movie-finder-frontend"
LABEL org.opencontainers.image.description="Movie Finder — Angular SPA served by nginx"
LABEL org.opencontainers.image.source="https://github.com/aharbii/movie-finder"

# Remove default site; nginx.conf.template will be rendered at startup
RUN rm /etc/nginx/conf.d/default.conf

# Copy compiled Angular bundle (412 kB gzipped in production)
COPY --from=builder /app/dist/movie-finder-ui/browser /usr/share/nginx/html

# Config template and entrypoint
COPY nginx.conf.template   /etc/nginx/nginx.conf.template
COPY docker-entrypoint.sh  /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
