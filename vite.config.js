import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { configDefaults } from 'vitest/config';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const appUrl = env.APP_URL || 'http://127.0.0.1:8000';
  const appParsed = new URL(appUrl);
  const appOrigin = !appParsed.port && ['localhost', '127.0.0.1'].includes(appParsed.hostname)
    ? `${appParsed.protocol}//${appParsed.hostname}:8000`
    : appParsed.origin;
  const basePathname = appUrl ? new URL(appUrl).pathname.replace(/\/$/, '') : '';
  const base = env.VITE_ASSET_BASE || `${basePathname}/build/`;

  return {
    base,
    plugins: [
      react(),
      laravel({
        input: ['resources/js/app.jsx'],
        refresh: true,
      }),
    ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'resources/js'),
    },
  },

  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@inertiajs/react', '@inertiajs/inertia'],
          xlsx: ['xlsx'],
          html2pdf: ['html2pdf.js'],
        },
      },
    },
  },

  // -------------------  EDITED SECTION -------------------
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    cors: {
      origin: ['http://127.0.0.1:8000', 'http://localhost:8000'],
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['*'],
    },
    proxy: {
      '/media-files': {
        target: appOrigin,
        changeOrigin: true,
      },
    },
    hmr: {
      clientPort: 5173,
      protocol: 'ws',
      host: '127.0.0.1',
      port: 5173,
      overlay: true,
    },
  },
  // -------------------------------------------------------

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './resources/js/test/setup.js',
  },

  // ... any other existing config ...
  };
});
