export const getBridgeUrl = () => {
  // Check if we're in a Vite environment
  const env = import.meta.env || {};
  
  // 1. Check for explicit environment variable override
  if (env.VITE_BRIDGE_URL) {
    return env.VITE_BRIDGE_URL;
  }

  // 2. Local development detection
  const isLocal = window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1' || 
                  window.location.hostname.startsWith('192.168.');
                  
  if (isLocal) {
    return 'http://localhost:5001';
  }
  
  // 3. Vercel deployment detection
  // Vercel provides VERCEL_URL but we need to ensure it's exposed to Vite
  const vercelUrl = env.VITE_VERCEL_URL || window.location.hostname;
  if (vercelUrl) {
    // VERCEL_URL doesn't include protocol, usually it's https in production
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    return `${protocol}//${vercelUrl}`;
  }

  // 4. Fallback to current origin
  return window.location.origin;
};
