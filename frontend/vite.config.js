import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/crawl": "http://127.0.0.1:8000",
      "/search": "http://127.0.0.1:8000",
      "/stats": "http://127.0.0.1:8000",
      "/logs": "http://127.0.0.1:8000",
      "/ws/metrics": {
        target: "http://127.0.0.1:8000",
        ws: true,
      },
      "/ws/logs": {
        target: "http://127.0.0.1:8000",
        ws: true,
      },
    },
  },
});

