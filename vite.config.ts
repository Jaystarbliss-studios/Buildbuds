import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import type { IncomingMessage, ServerResponse } from 'http';

import cloudinarySignatureHandler from './api/cloudinary/signature.ts';
import cloudinaryDeleteHandler from './api/cloudinary/delete.ts';
import studentSubmitHandler from './api/student-access/submit.ts';
import studentApproveHandler from './api/student-access/approve.ts';
import studentRejectHandler from './api/student-access/reject.ts';
import studentNotifyHandler from './api/student-access/notify.ts';

function localVercelApiPlugin(): Plugin {
  const routes: Record<string, typeof cloudinarySignatureHandler> = {
    '/api/cloudinary/signature': cloudinarySignatureHandler,
    '/api/cloudinary/delete': cloudinaryDeleteHandler,
    '/api/student-access/submit': studentSubmitHandler,
    '/api/student-access/approve': studentApproveHandler,
    '/api/student-access/reject': studentRejectHandler,
    '/api/student-access/notify': studentNotifyHandler,
  };

  return {
    name: 'buildbuds-local-vercel-api',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        const cleanUrl = (req.url || '').split('?')[0];
        const routeHandler = routes[cleanUrl];
        if (!routeHandler) {
          return next();
        }

        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', async () => {
          const rawBody = Buffer.concat(chunks).toString('utf8');
          let parsedBody: unknown = {};
          if (rawBody) {
            try {
              parsedBody = JSON.parse(rawBody);
            } catch {
              parsedBody = rawBody;
            }
          }

          let statusCode = 200;
          const apiRes = {
            status(code: number) {
              statusCode = code;
              return apiRes;
            },
            json(payload: unknown) {
              res.statusCode = statusCode;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(payload));
            },
          };

          try {
            await routeHandler(
              {
                method: req.method,
                headers: req.headers as Record<string, string | string[] | undefined>,
                body: parsedBody,
              },
              apiRes
            );
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error: err instanceof Error ? err.message : 'Internal API error',
              })
            );
          }
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    // Only expose VITE_ and FIREBASE_ client config variables to the browser bundle.
    // Server secrets (FB_ADMIN_SERVICE_ACCOUNT_JSON, CLOUDINARY_API_SECRET, RESEND_API_KEY) remain strictly server-only.
    envPrefix: ['VITE_', 'FIREBASE_'],
    plugins: [
      localVercelApiPlugin(),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'assets/aistudio/images/aurora-logo.png',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: {
          id: '/',
          name: 'Build Buds Community',
          short_name: 'Build Buds',
          description:
            'Build Buds is where young creators share their projects, exchange ideas, solve problems and build amazing things together across schools.',
          theme_color: '#06060c',
          background_color: '#06060c',
          display: 'standalone',
          start_url: '/community',
          scope: '/',
          icons: [
            {
              src: '/assets/aistudio/images/aurora-logo.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/assets/aistudio/images/aurora-logo.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/assets/aistudio/images/aurora-logo.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
