import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import dns from 'node:dns';

// Force Node.js on Host Machine to use IPv4 when connecting to 127.0.0.1
dns.setDefaultResultOrder('ipv4first');

export default defineConfig(() => {
  // Use http://127.0.0.1:8000 for local npm run dev on Host Machine
  const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:8000';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, res) => {
              console.error(`\x1b[31m[Vite Proxy Error]\x1b[0m Could not connect to API Gateway at ${proxyTarget}: ${err.message}`);
              if (res && !res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                  detail: `Vite Proxy Error: Backend gateway (${proxyTarget}) is unreachable. Error: ${err.message}` 
                }));
              }
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log(`\x1b[36m[Proxy -> Backend]\x1b[0m ${req.method} ${req.url} -> ${proxyTarget}${proxyReq.path}`);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log(`\x1b[32m[Proxy <- Backend]\x1b[0m ${req.method} ${req.url} Status: ${proxyRes.statusCode}`);
            });
          },
        },
        '/sub': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});