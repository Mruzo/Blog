const { createProxyMiddleware } = require('http-proxy-middleware');

/**
 * Development-only proxy configuration for webpack-dev-server
 * 
 * IMPORTANT: This file is ONLY loaded in development mode by webpack-dev-server.
 * Production serves static files directly from build/ directory via Django's ReactAppView.
 * This proxy configuration has NO impact on production.
 * 
 * The proxy middleware runs BEFORE historyApiFallback (via onBeforeSetupMiddleware),
 * ensuring API requests are forwarded to Django before React Router handles them.
 */
module.exports = function(app) {
  console.log('[PROXY SETUP] Loading proxy configuration...');
  
  // CRITICAL: Register proxy middleware FIRST, before any other middleware
  // The proxy middleware MUST be registered before any other middleware
  // that might handle these routes (like historyApiFallback)
  
  // Proxy API requests to Django backend - MUST BE FIRST
  // CRITICAL: Use pathRewrite to ensure /api prefix is preserved when forwarding to Django
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8000',
      changeOrigin: true,
      secure: false,
      logLevel: 'debug',
      // CRITICAL: When using app.use('/api', ...), Express strips the /api prefix
      // before passing to the proxy middleware. We need to add it back so Django
      // receives the full path: /api/icvybz/stories/public/
      pathRewrite: function (path, req) {
        // path will be like '/icvybz/stories/public/' (without /api)
        // We need to add /api back: '/api/icvybz/stories/public/'
        const rewritten = '/api' + path;
        console.log('[PROXY] Path rewrite:', path, '->', rewritten);
        return rewritten;
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log('[PROXY] ===== API REQUEST INTERCEPTED =====');
        console.log('[PROXY] Original URL:', req.url);
        console.log('[PROXY] Original Path:', req.path);
        console.log('[PROXY] Proxy Request Path:', proxyReq.path);
        console.log('[PROXY] Headers:', {
          'Accept': req.headers.accept,
          'Content-Type': req.headers['content-type'],
          'Host': req.headers.host,
          'Cookie': req.headers.cookie ? 'Present' : 'Missing'
        });
        // Ensure Accept header is preserved for JSON responses
        if (!proxyReq.getHeader('Accept') && req.headers.accept) {
          proxyReq.setHeader('Accept', req.headers.accept);
        }
        // Explicitly set Accept header for JSON
        proxyReq.setHeader('Accept', 'application/json');
        // Preserve cookies for CSRF token
        if (req.headers.cookie) {
          proxyReq.setHeader('Cookie', req.headers.cookie);
        }
        // Preserve original headers
        proxyReq.setHeader('X-Forwarded-Host', req.headers.host);
        proxyReq.setHeader('X-Forwarded-Proto', req.protocol || 'http');
        console.log('[PROXY] Forwarding to Django:', 'http://localhost:8000' + proxyReq.path);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log('[PROXY] ===== API RESPONSE RECEIVED =====');
        console.log('[PROXY] Status:', proxyRes.statusCode);
        console.log('[PROXY] Content-Type:', proxyRes.headers['content-type']);
        console.log('[PROXY] Response headers:', Object.keys(proxyRes.headers));
        // Log if we're getting HTML instead of JSON
        if (proxyRes.headers['content-type'] && proxyRes.headers['content-type'].includes('text/html')) {
          console.error('[PROXY ERROR] Received HTML instead of JSON!');
          console.error('[PROXY ERROR] Request URL:', req.url);
          console.error('[PROXY ERROR] Request Path:', req.path);
          console.error('[PROXY ERROR] This suggests Django catch-all route matched instead of API route');
        }
      },
      onError: (err, req, res) => {
        console.error('[PROXY ERROR] Proxy error:', err.message);
        console.error('[PROXY ERROR] Request:', req.method, req.url);
        // Send proper error response instead of letting it fall through
        if (!res.headersSent) {
          res.status(502).json({ error: 'Proxy error', message: err.message });
        }
      },
      // Keep the /api prefix as-is - no pathRewrite needed
      // This ensures Django receives the full path: /api/icvybz/stories/public/
    })
  );
  console.log('[PROXY SETUP] API proxy registered for /api/*');
  
  // Proxy immersivecomics API requests to Django backend - MUST BE BEFORE /media
  // These endpoints are outside the /api/icvybz namespace
  // CRITICAL: When using app.use('/immersivecomics/api', ...), Express strips the prefix
  // We need to preserve the full path when forwarding to Django
  app.use(
    '/immersivecomics/api',
    createProxyMiddleware({
      target: 'http://localhost:8000',
      changeOrigin: true,
      secure: false,
      logLevel: 'debug',
      // CRITICAL: Preserve the full path including /immersivecomics/api prefix
      pathRewrite: function (path, req) {
        // path will be like '/studios/' (without /immersivecomics/api)
        // We need to add it back: '/immersivecomics/api/studios/'
        const rewritten = '/immersivecomics/api' + path;
        console.log('[PROXY] Immersivecomics path rewrite:', path, '->', rewritten);
        return rewritten;
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log('[PROXY] ===== IMMERSIVECOMICS API REQUEST INTERCEPTED =====');
        console.log('[PROXY] Original URL:', req.url);
        console.log('[PROXY] Original Path:', req.path);
        console.log('[PROXY] Proxy Request Path:', proxyReq.path);
        // Preserve original headers
        proxyReq.setHeader('X-Forwarded-Host', req.headers.host);
        proxyReq.setHeader('X-Forwarded-Proto', req.protocol || 'http');
        // Explicitly set Accept header for JSON
        proxyReq.setHeader('Accept', 'application/json');
        console.log('[PROXY] Forwarding to Django:', 'http://localhost:8000' + proxyReq.path);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log('[PROXY] ===== IMMERSIVECOMICS API RESPONSE RECEIVED =====');
        console.log('[PROXY] Status:', proxyRes.statusCode);
        console.log('[PROXY] Content-Type:', proxyRes.headers['content-type']);
        // Log if we're getting HTML instead of JSON
        if (proxyRes.headers['content-type'] && proxyRes.headers['content-type'].includes('text/html')) {
          console.error('[PROXY ERROR] Received HTML instead of JSON!');
          console.error('[PROXY ERROR] Request URL:', req.url);
          console.error('[PROXY ERROR] Request Path:', req.path);
        }
      },
      onError: (err, req, res) => {
        console.error('[PROXY ERROR] Immersivecomics API proxy error:', err.message);
        console.error('[PROXY ERROR] Request:', req.method, req.url);
        if (!res.headersSent) {
          res.status(502).json({ error: 'Proxy error', message: err.message });
        }
      },
    })
  );
  console.log('[PROXY SETUP] Immersivecomics API proxy registered for /immersivecomics/api/*');
  
  // Proxy media files to Django backend (development only)
  // In production, media files are served directly by Django/nginx
  app.use(
    '/media',
    createProxyMiddleware({
      target: 'http://localhost:8000',
      changeOrigin: true,
      secure: false,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log('[PROXY] Media request:', req.method, req.url);
        // Preserve original headers
        proxyReq.setHeader('X-Forwarded-Host', req.headers.host);
        proxyReq.setHeader('X-Forwarded-Proto', req.protocol || 'http');
      },
      onError: (err, req, res) => {
        console.error('[PROXY ERROR] Media proxy error:', err.message);
      },
    })
  );
  console.log('[PROXY SETUP] Media proxy registered for /media/*');
  
  // Add logging middleware AFTER proxy (for debugging)
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/immersivecomics/api')) {
      console.log('[MIDDLEWARE] Request received AFTER proxy:', req.method, req.path, req.url);
    }
    next();
  });
  
  // Proxy Django admin requests to Django backend (must be before catch-all)
  // Match any path starting with /uno so /uno, /uno/, /uno/icvybz/... all get proxied
  app.use(
    '/uno',
    createProxyMiddleware({
      target: 'http://127.0.0.1:8000',
      changeOrigin: true,
      secure: false,
      ws: true,
      logLevel: 'debug',
      // Express strips mount path: req.url is '/' or '/icvybz/...'. Restore /uno for Django.
      pathRewrite: (path) => (path === '/' || path === '') ? '/uno/' : '/uno' + path,
      onProxyReq: (proxyReq, req, res) => {
        console.log('[PROXY] /uno request:', req.method, req.url, '->', 'http://127.0.0.1:8000' + proxyReq.path);
        proxyReq.setHeader('X-Forwarded-Host', req.headers.host);
        proxyReq.setHeader('X-Forwarded-Proto', req.protocol || 'http');
        if (req.headers.cookie) {
          proxyReq.setHeader('Cookie', req.headers.cookie);
        }
      },
      onError: (err, req, res) => {
        console.error('[PROXY ERROR] /uno:', err.message);
        if (!res.headersSent) {
          res.status(502).send('Proxy to Django failed. Is the backend running on http://127.0.0.1:8000?');
        }
      },
    })
  );
  console.log('[PROXY SETUP] Admin proxy registered for /uno -> http://127.0.0.1:8000/uno');
  console.log('[PROXY SETUP] Proxy configuration complete');
};


