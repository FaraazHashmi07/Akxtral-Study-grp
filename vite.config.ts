import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Determine base path based on environment
  // For Netlify: use root path '/'
  // For GitHub Pages: use repository path '/Akxtral-Study-grp/'
  const isNetlify = process.env.NETLIFY === 'true' || process.env.CONTEXT === 'production' || process.env.DEPLOY_PRIME_URL;
  const base = isNetlify ? '/' : '/Akxtral-Study-grp/';

  console.log('🔧 Vite Config:', {
    isNetlify,
    base,
    env: {
      NETLIFY: process.env.NETLIFY,
      CONTEXT: process.env.CONTEXT,
      DEPLOY_PRIME_URL: process.env.DEPLOY_PRIME_URL
    }
  });

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
