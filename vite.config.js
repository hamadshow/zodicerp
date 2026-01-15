import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { configDefaults } from 'vitest/config';
import path from 'path';

export default defineConfig({
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
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@inertiajs/react', '@inertiajs/inertia'],
        },
      },
    },
  },

  // -------------------  EDITED SECTION -------------------
  server: {
    cors: {
      origin: ['http://127.0.0.1:8000', 'http://localhost:8000'],
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['*'],
    },
    hmr: {
      clientPort: 5173,
      protocol: 'ws',
      host: 'localhost',
    },
  },
  // -------------------------------------------------------

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './resources/js/test/setup.js',
  },

  // ... any other existing config ...
});
