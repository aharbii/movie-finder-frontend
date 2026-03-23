// Runtime environment — overwritten by docker-entrypoint.sh at container start.
// In development the proxy handles routing so API_URL is left empty (same origin).
window.__env = window.__env || {};
