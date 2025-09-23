const { createProxyMiddleware } = require('http-proxy-middleware');

// Dynamic proxy target for CRA based on environment variable
// Usage:
// - Windows PowerShell cmd.exe style in package.json scripts:
//   start:local -> set API_PROXY_TARGET=http://localhost:3000&& react-scripts start
//   start:lan   -> set API_PROXY_TARGET=http://192.168.1.16:3000&& react-scripts start
// Fallback is localhost:3000 if env not set.

module.exports = function(app) {
  const target = process.env.API_PROXY_TARGET || 'http://localhost:3000';
  const opts = {
    target,
    changeOrigin: true,
    ws: false,
    logLevel: 'warn',
  };

  app.use('/api', createProxyMiddleware(opts));
  app.use('/uploads', createProxyMiddleware(opts));
};
