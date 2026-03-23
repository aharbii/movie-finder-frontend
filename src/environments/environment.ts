export const environment = {
  production: false,
  // Empty string = same origin. The dev server proxies /auth, /chat, /health
  // to http://localhost:8000 via proxy.conf.json, avoiding CORS preflight requests.
  apiUrl: '',
};
