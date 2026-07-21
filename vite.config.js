import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const bridgeTarget = env.VITE_BRIDGE_URL;

  // STRICT SECURITY CHECK: Prohibit loopback targets
  const forbidden = ['localhost', '127.0.0.1', '::1', '[::1]'];
  if (bridgeTarget && forbidden.some(f => bridgeTarget.toLowerCase().includes(f))) {
    throw new Error(`\n\n[SECURITY FATAL] Prohibited bridge target detected: ${bridgeTarget}\nLoopback addresses are strictly forbidden by system policy.\n\n`);
  }

  const networkHostname = process.env.COMPUTERNAME || 'aegis';
  const finalTarget = bridgeTarget || `http://${networkHostname}.local:5001`;

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
        '/proxy': finalTarget,
        '/execute': finalTarget,
        '/system': finalTarget,
        '/search_music': finalTarget,
        '/media': finalTarget
      }
    }
  };
});
