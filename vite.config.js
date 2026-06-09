import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const bridgeTarget = env.VITE_BRIDGE_URL || 'http://localhost:5001';

  return {
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
        '/proxy': bridgeTarget,
        '/execute': bridgeTarget,
        '/system': bridgeTarget,
        '/search_music': bridgeTarget,
        '/media': bridgeTarget
      }
    }
  };
});
