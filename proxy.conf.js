/**
 * Angular dev-server proxy configuration.
 *
 * Problem: /chat is both an Angular SPA route (GET) and a backend API
 * endpoint (POST /chat, GET /chat/sessions, GET /chat/:id/history).
 * A plain JSON proxy for "/chat" would intercept the SPA navigation and
 * return the backend's 405, breaking direct-URL loads and page reloads.
 *
 * Solution: use the webpack-dev-server `bypass` hook on the /chat entry to
 * return '/index.html' for bare "GET /chat" requests (SPA route), while
 * still proxying all actual API calls under that prefix.
 */
module.exports = {
  '/auth': {
    target: 'http://localhost:8000',
    secure: false,
    changeOrigin: true,
    logLevel: 'info',
  },

  '/chat': {
    target: 'http://localhost:8000',
    secure: false,
    changeOrigin: true,
    logLevel: 'info',
    bypass(req) {
      // Only "GET /chat" (exact) is the Angular route — serve the SPA shell.
      // Everything else (/chat/sessions, POST /chat, /chat/:id/history) is API.
      if (req.method === 'GET' && req.url === '/chat') {
        return '/index.html';
      }
    },
  },

  '/health': {
    target: 'http://localhost:8000',
    secure: false,
    changeOrigin: true,
    logLevel: 'info',
  },
};
