#!/bin/sh
# =============================================================================
# docker-entrypoint.sh
#
# Runs once at container start before nginx is exec'd.
# 1. Writes env.js so the Angular app can read runtime config via window.__env.
# 2. Processes nginx.conf.template → /etc/nginx/conf.d/default.conf using
#    envsubst, substituting only $BACKEND_URL (avoids clobbering nginx vars).
# =============================================================================
set -e

# ── Defaults ─────────────────────────────────────────────────────────────────
: "${API_URL:=}"                                  # empty = same-origin (via nginx proxy)
: "${BACKEND_URL:=http://localhost:8000}"          # where nginx proxies API calls

# ── 1. Generate runtime environment ──────────────────────────────────────────
cat > /usr/share/nginx/html/env.js <<EOF
window.__env = {
  API_URL: "${API_URL}"
};
EOF

echo "[entrypoint] env.js written (API_URL=${API_URL})"

# ── 2. Render nginx config ────────────────────────────────────────────────────
# Only $BACKEND_URL is substituted — nginx's own $variables are left intact.
envsubst '$BACKEND_URL' \
  < /etc/nginx/nginx.conf.template \
  > /etc/nginx/conf.d/default.conf

echo "[entrypoint] nginx config rendered (BACKEND_URL=${BACKEND_URL})"

# ── 3. Hand off to nginx ──────────────────────────────────────────────────────
exec nginx -g "daemon off;"
