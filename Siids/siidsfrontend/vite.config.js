// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:2005',
        changeOrigin: true,
        secure: false,
      },
      '/ws-notifications': {
        target: 'http://localhost:2005',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
