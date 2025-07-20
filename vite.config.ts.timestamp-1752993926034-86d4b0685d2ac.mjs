// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.mjs";
var vite_config_default = defineConfig(({ command, mode }) => {
  const isDev = command === "serve";
  const isNetlify = process.env.NETLIFY === "true" || process.env.CONTEXT === "production" || process.env.DEPLOY_PRIME_URL;
  const base = isDev || isNetlify ? "/" : "/Akxtral-Study-grp/";
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgY29tbWFuZCwgbW9kZSB9KSA9PiB7XG4gIC8vIERldGVybWluZSBiYXNlIHBhdGggYmFzZWQgb24gZW52aXJvbm1lbnRcbiAgLy8gRm9yIGRldmVsb3BtZW50OiB1c2Ugcm9vdCBwYXRoICcvJ1xuICAvLyBGb3IgTmV0bGlmeTogdXNlIHJvb3QgcGF0aCAnLydcbiAgLy8gRm9yIEdpdEh1YiBQYWdlczogdXNlIHJlcG9zaXRvcnkgcGF0aCAnL0FreHRyYWwtU3R1ZHktZ3JwLydcbiAgY29uc3QgaXNEZXYgPSBjb21tYW5kID09PSAnc2VydmUnO1xuICBjb25zdCBpc05ldGxpZnkgPSBwcm9jZXNzLmVudi5ORVRMSUZZID09PSAndHJ1ZScgfHwgcHJvY2Vzcy5lbnYuQ09OVEVYVCA9PT0gJ3Byb2R1Y3Rpb24nIHx8IHByb2Nlc3MuZW52LkRFUExPWV9QUklNRV9VUkw7XG4gIGNvbnN0IGJhc2UgPSBpc0RldiB8fCBpc05ldGxpZnkgPyAnLycgOiAnL0FreHRyYWwtU3R1ZHktZ3JwLyc7XG5cbiAgcmV0dXJuIHtcbiAgICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gICAgYmFzZSxcbiAgYnVpbGQ6IHtcbiAgICAvLyBFbnN1cmUgcHJvcGVyIGFzc2V0IGhhbmRsaW5nXG4gICAgYXNzZXRzRGlyOiAnYXNzZXRzJyxcbiAgICAvLyBHZW5lcmF0ZSBzb3VyY2UgbWFwcyBmb3IgZGVidWdnaW5nXG4gICAgc291cmNlbWFwOiBmYWxzZSxcbiAgICAvLyBPcHRpbWl6ZSBjaHVuayBzaXplXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rczoge1xuICAgICAgICAgIHZlbmRvcjogWydyZWFjdCcsICdyZWFjdC1kb20nXSxcbiAgICAgICAgICBmaXJlYmFzZTogWydmaXJlYmFzZS9hcHAnLCAnZmlyZWJhc2UvYXV0aCcsICdmaXJlYmFzZS9maXJlc3RvcmUnLCAnZmlyZWJhc2Uvc3RvcmFnZSddLFxuICAgICAgICAgIHVpOiBbJ2ZyYW1lci1tb3Rpb24nLCAnbHVjaWRlLXJlYWN0J11cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgICBvcHRpbWl6ZURlcHM6IHtcbiAgICAgIGV4Y2x1ZGU6IFsnbHVjaWRlLXJlYWN0J10sXG4gICAgfSxcbiAgfTtcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF5TixTQUFTLG9CQUFvQjtBQUN0UCxPQUFPLFdBQVc7QUFHbEIsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxTQUFTLEtBQUssTUFBTTtBQUtqRCxRQUFNLFFBQVEsWUFBWTtBQUMxQixRQUFNLFlBQVksUUFBUSxJQUFJLFlBQVksVUFBVSxRQUFRLElBQUksWUFBWSxnQkFBZ0IsUUFBUSxJQUFJO0FBQ3hHLFFBQU0sT0FBTyxTQUFTLFlBQVksTUFBTTtBQUV4QyxTQUFPO0FBQUEsSUFDTCxTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsSUFDakI7QUFBQSxJQUNGLE9BQU87QUFBQTtBQUFBLE1BRUwsV0FBVztBQUFBO0FBQUEsTUFFWCxXQUFXO0FBQUE7QUFBQSxNQUVYLGVBQWU7QUFBQSxRQUNiLFFBQVE7QUFBQSxVQUNOLGNBQWM7QUFBQSxZQUNaLFFBQVEsQ0FBQyxTQUFTLFdBQVc7QUFBQSxZQUM3QixVQUFVLENBQUMsZ0JBQWdCLGlCQUFpQixzQkFBc0Isa0JBQWtCO0FBQUEsWUFDcEYsSUFBSSxDQUFDLGlCQUFpQixjQUFjO0FBQUEsVUFDdEM7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxJQUNFLGNBQWM7QUFBQSxNQUNaLFNBQVMsQ0FBQyxjQUFjO0FBQUEsSUFDMUI7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
