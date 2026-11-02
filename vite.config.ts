import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cpSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { handleApiRequest } from './backend/api.ts';

const apiMiddleware = async (req: any, res: any, next: any) => {
  if (req.url?.startsWith('/api/')) {
    try {
      const handled = await handleApiRequest(req, res);
      if (handled) return;
    } catch (err) {
      console.error('API route error:', err);
    }
  }
  next();
};

// Runtime files index.html loads from the map kit with plain <script> tags, which Vite doesn't bundle.
const MAP_KIT_RUNTIME = [
  'assets/proj4.js',
  'gps-projection.js',
  'map-labels.js',
  'map-data.js',
  'map-data.json',
];

const apiAndMapKitPlugin = () => ({
  name: 'civicsense-api-and-map-kit',
  configureServer(server: any) {
    server.middlewares.use(apiMiddleware);
  },
  configurePreviewServer(server: any) {
    server.middlewares.use(apiMiddleware);
  },
  closeBundle() {
    for (const file of MAP_KIT_RUNTIME) {
      cpSync(`Dibrugarh-University-Map-Kit/${file}`, `dist/Dibrugarh-University-Map-Kit/${file}`);
    }
  },
});

export default defineConfig({
  plugins: [
    react(),
    apiAndMapKitPlugin(),
  ],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        admin: fileURLToPath(new URL('./admin.html', import.meta.url)),
      },
    },
  },
  server: {
    port: 3000,
  },
});
