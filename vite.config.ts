import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

const apiTarget = process.env.VITE_API_PROXY ?? 'http://localhost:8000';

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
    allowedHosts: ['.trycloudflare.com'],
    // `/media` is where the local store serves originals and thumbnails.
    // Without it Vite answers with the SPA's index.html: every image breaks
    // and a click on one lands on the login page.
    proxy: {
      '/api': apiTarget,
      '/media': apiTarget,
    },
  },
  build: {
    // Each module is its own chunk: an uninstalled module ships zero bytes.
    // Libraries stay in one vendor chunk so they are not duplicated into — or
    // attributed to — whichever module happened to import them first.
    rollupOptions: {
      output: {
        manualChunks(id) {
          // ECharts is heavier than the rest of the vendor bundle put
          // together, and only the record of values draws. Its own chunk
          // keeps it out of the boot path for everyone else.
          if (id.includes('node_modules/echarts') || id.includes('node_modules/zrender')) {
            return 'echarts';
          }
          if (id.includes('node_modules')) return 'vendor';
          const match = /src\/modules\/([^/]+)\//.exec(id);
          return match ? `module-${match[1]}` : undefined;
        },
      },
    },
  },
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', globals: true },
});
