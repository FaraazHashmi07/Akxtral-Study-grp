// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.mjs";
var vite_config_default = defineConfig(({ command, mode }) => {
  const isNetlify = process.env.NETLIFY === "true" || process.env.CONTEXT === "production" || process.env.DEPLOY_PRIME_URL;
  const base = isNetlify ? "/" : "/Akxtral-Study-grp/";
  return {
    plugins: [react()],
    base,
    build: {
      // Ensure proper asset handling
      assetsDir: "assets",
      // Generate source maps for debugging
      sourcemap: false,
      // Optimize chunk size
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom"],
            firebase: ["firebase/app", "firebase/auth", "firebase/firestore", "firebase/storage"],
            ui: ["framer-motion", "lucide-react"]
          }
        }
      }
    },
    optimizeDeps: {
      exclude: ["lucide-react"]
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgY29tbWFuZCwgbW9kZSB9KSA9PiB7XG4gIC8vIERldGVybWluZSBiYXNlIHBhdGggYmFzZWQgb24gZW52aXJvbm1lbnRcbiAgLy8gRm9yIE5ldGxpZnk6IHVzZSByb290IHBhdGggJy8nXG4gIC8vIEZvciBHaXRIdWIgUGFnZXM6IHVzZSByZXBvc2l0b3J5IHBhdGggJy9Ba3h0cmFsLVN0dWR5LWdycC8nXG4gIGNvbnN0IGlzTmV0bGlmeSA9IHByb2Nlc3MuZW52Lk5FVExJRlkgPT09ICd0cnVlJyB8fCBwcm9jZXNzLmVudi5DT05URVhUID09PSAncHJvZHVjdGlvbicgfHwgcHJvY2Vzcy5lbnYuREVQTE9ZX1BSSU1FX1VSTDtcbiAgY29uc3QgYmFzZSA9IGlzTmV0bGlmeSA/ICcvJyA6ICcvQWt4dHJhbC1TdHVkeS1ncnAvJztcblxuICByZXR1cm4ge1xuICAgIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgICBiYXNlLFxuICBidWlsZDoge1xuICAgIC8vIEVuc3VyZSBwcm9wZXIgYXNzZXQgaGFuZGxpbmdcbiAgICBhc3NldHNEaXI6ICdhc3NldHMnLFxuICAgIC8vIEdlbmVyYXRlIHNvdXJjZSBtYXBzIGZvciBkZWJ1Z2dpbmdcbiAgICBzb3VyY2VtYXA6IGZhbHNlLFxuICAgIC8vIE9wdGltaXplIGNodW5rIHNpemVcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgdmVuZG9yOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbSddLFxuICAgICAgICAgIGZpcmViYXNlOiBbJ2ZpcmViYXNlL2FwcCcsICdmaXJlYmFzZS9hdXRoJywgJ2ZpcmViYXNlL2ZpcmVzdG9yZScsICdmaXJlYmFzZS9zdG9yYWdlJ10sXG4gICAgICAgICAgdWk6IFsnZnJhbWVyLW1vdGlvbicsICdsdWNpZGUtcmVhY3QnXVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9LFxuICAgIG9wdGltaXplRGVwczoge1xuICAgICAgZXhjbHVkZTogWydsdWNpZGUtcmVhY3QnXSxcbiAgICB9LFxuICB9O1xufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXlOLFNBQVMsb0JBQW9CO0FBQ3RQLE9BQU8sV0FBVztBQUdsQixJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLFNBQVMsS0FBSyxNQUFNO0FBSWpELFFBQU0sWUFBWSxRQUFRLElBQUksWUFBWSxVQUFVLFFBQVEsSUFBSSxZQUFZLGdCQUFnQixRQUFRLElBQUk7QUFDeEcsUUFBTSxPQUFPLFlBQVksTUFBTTtBQUUvQixTQUFPO0FBQUEsSUFDTCxTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsSUFDakI7QUFBQSxJQUNGLE9BQU87QUFBQTtBQUFBLE1BRUwsV0FBVztBQUFBO0FBQUEsTUFFWCxXQUFXO0FBQUE7QUFBQSxNQUVYLGVBQWU7QUFBQSxRQUNiLFFBQVE7QUFBQSxVQUNOLGNBQWM7QUFBQSxZQUNaLFFBQVEsQ0FBQyxTQUFTLFdBQVc7QUFBQSxZQUM3QixVQUFVLENBQUMsZ0JBQWdCLGlCQUFpQixzQkFBc0Isa0JBQWtCO0FBQUEsWUFDcEYsSUFBSSxDQUFDLGlCQUFpQixjQUFjO0FBQUEsVUFDdEM7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxJQUNFLGNBQWM7QUFBQSxNQUNaLFNBQVMsQ0FBQyxjQUFjO0FBQUEsSUFDMUI7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
