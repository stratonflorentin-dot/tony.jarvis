import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/proxy': 'http://localhost:5001',
      '/execute': 'http://localhost:5001',
      '/system': 'http://localhost:5001',
      '/search_music': 'http://localhost:5001',
      '/media': 'http://localhost:5001'
    }
  }
});
