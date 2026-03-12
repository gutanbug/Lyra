const proxy = require('http-proxy-middleware');

/**
 * /api 경로만 localhost:5000으로 프록시.
 * /fonts, /images 등 정적 자원은 프록시하지 않음 (ECONNREFUSED 방지)
 */
module.exports = function (app) {
  app.use(
    '/api',
    proxy({
      target: 'http://localhost:5000',
      changeOrigin: true,
    })
  );
};
