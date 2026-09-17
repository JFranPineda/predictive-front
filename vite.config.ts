import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
      '@modules': fileURLToPath(new URL('./src/modules', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
    },
  },
  server: {
    port: Number(process.env.VITE_PORT ?? 5173),
    // Same-origin in dev, so no CORS and no token in a cross-site request.
    proxy: { '/api': process.env.VITE_API_PROXY ?? 'http://localhost:8000' },
  },
  build: {
    // Each module is its own chunk: an uninstalled module ships zero bytes.
    // Libraries stay in one vendor chunk so they are not duplicated into — or
    // attributed to — whichever module happened to import them first.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor';
          const match = /src\/modules\/([^/]+)\//.exec(id);
          return match ? `module-${match[1]}` : undefined;
        },
      },
    },
  },
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', globals: true },
});
