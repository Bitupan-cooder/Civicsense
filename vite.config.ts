import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import { handleApiRequest } from './backend/api.ts';

const apiMiddlewarePlugin = () => ({
  name: 'api-middleware',
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: any) => {
      if (req.url?.startsWith('/api/')) {
        try {
          const handled = await handleApiRequest(req, res);
          if (handled) return;
        } catch (err) {
          console.error('API route error:', err);
        }
      }
      next();
    });
  },
});

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    apiMiddlewarePlugin(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 3000,
  },
});
