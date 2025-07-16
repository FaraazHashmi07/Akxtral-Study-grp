import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Determine base path based on environment
  // For development: use root path '/'
  // For Netlify: use root path '/'
  // For GitHub Pages: use repository path '/Akxtral-Study-grp/'
  const isDev = command === 'serve';
  const isNetlify = process.env.NETLIFY === 'true' || process.env.CONTEXT === 'production' || process.env.DEPLOY_PRIME_URL;
  const base = isDev || isNetlify ? '/' : '/Akxtral-Study-grp/';

  return {
    plugins: [react()],
    base,
  build: {
    // Ensure proper asset handling
    assetsDir: 'assets',
    // Generate source maps for debugging
    sourcemap: false,
    // Optimize chunk size
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          ui: ['framer-motion', 'lucide-react']
        }
      }
    }
  },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
