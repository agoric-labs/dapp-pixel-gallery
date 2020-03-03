// Manual Proxy

// Note: You do not need to import this file anywhere. It is automatically registered
// when you start the development server.

const fs = require('fs');

const { createProxyMiddleware } = require('http-proxy-middleware');

const defaults = fs.readFileSync(`${__dirname}/utils/defaults.js`, 'utf-8');
const dappConstants = process.env.REACT_APP_DAPP_CONSTANTS_JSON ?
  JSON.parse(process.env.REACT_APP_DAPP_CONSTANTS_JSON) :
  JSON.parse(defaults.replace(/^export default/, ''));

  const { API_URL, BRIDGE_URL } = dappConstants;

module.exports = function manualProxy(app) {
  if (API_URL > '') {
    app.use('/vat', createProxyMiddleware({ target: API_URL }));
  }
  if (BRIDGE_URL > '') {
    app.use(
      '/bridge',
      createProxyMiddleware({
        target: BRIDGE_URL,
        pathRewrite: {
          '^/bridge': '/vat',
        },
      }),
    );
  }
};
