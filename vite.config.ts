import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const env = loadEnv('development', process.cwd(), '');
Object.assign(process.env, env);
import { handleApiRequest } from './backend/api.ts';
import { startChatBots } from './backend/chatbots.ts';

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

// React Router URLs (PRD "Pages"): the officials' app owns /admin, /authority and /map; every other page URL
// without a file extension is the student app. Production hosting needs the same rewrites.
const OFFICIAL_ROUTES = /^\/(admin|authority|map)(\/|$|\?)/;
const pageRewrite = (req: any, _res: any, next: any) => {
  const url: string = req.url || '/';
  const path = url.split('?')[0];
  const isPage = req.method === 'GET' && !path.startsWith('/api/') && !path.startsWith('/@') && !path.startsWith('/src/')
    && !path.startsWith('/node_modules/') && !/\.[a-z0-9]+$/i.test(path);
  if (isPage) req.url = OFFICIAL_ROUTES.test(url) ? '/admin.html' : '/index.html';
  next();
};

// Runtime files index.html loads from the map kit with plain <script> tags, which Vite doesn't bundle.
const MAP_KIT_RUNTIME = [
  'assets/proj4.js',
  'gps-projection.js',
  'map-labels.js',
  'map-data.json',
];

const apiAndMapKitPlugin = () => ({
  name: 'civicsense-api-and-map-kit',
  configureServer(server: any) {
    server.middlewares.use(apiMiddleware);
    server.middlewares.use(pageRewrite);
    startChatBots(); // only with CHAT_BOTS=true
  },
  configurePreviewServer(server: any) {
    server.middlewares.use(apiMiddleware);
    server.middlewares.use(pageRewrite);
    startChatBots();
  },
  closeBundle() {
    for (const file of MAP_KIT_RUNTIME) {
      const source = `Dibrugarh-University-Map-Kit/${file}`;
      if (!existsSync(source)) {
        console.warn(`[civicsense-api-and-map-kit] Skipping missing optional map runtime: ${source}`);
        continue;
      }
      const destination = `dist/Dibrugarh-University-Map-Kit/${file}`;
      mkdirSync(dirname(destination), { recursive: true });
      cpSync(source, destination);
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
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 3000,
  },
});
