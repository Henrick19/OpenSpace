import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Frontend development server. The proxy keeps browser requests on one origin
// while forwarding /api traffic to the local Node.js backend.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
