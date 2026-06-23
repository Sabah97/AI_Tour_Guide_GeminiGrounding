import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const API_BASE = env.VITE_API_BASE_URL || 'http://localhost:8787';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: false,
      proxy: {
        '/api': {
          target: API_BASE,
          changeOrigin: true,
          secure: false,
          timeout: 120000, // 2 minutes for Gemini responses
          proxyTimeout: 120000,
          // Retry logic for proxy
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('[vite] Proxy error:', err.message);
              if (!res.headersSent) {
                res.writeHead(503, {
                  'Content-Type': 'application/json',
                });
                res.end(
                  JSON.stringify({
                    error: 'Service temporarily unavailable. Server may be starting up.',
                    code: 'PROXY_ERROR',
                  })
                );
              }
            });
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // Increase timeout for Gemini API calls (can be slow)
              proxyReq.setTimeout(120000); // 2 minutes
            });
          },
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
    },
  };
});
