import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "frontend",
  plugins: [react()],
  server: {
    proxy: {
      "/api/": {
        target: "http://127.0.0.1:8000",
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyRequest, request) => {
            const origin = request.headers.origin;
            if (origin && new URL(origin).host === request.headers.host) {
              proxyRequest.setHeader("origin", origin);
              proxyRequest.setHeader("host", request.headers.host!);
            }
          });
        },
      },
    },
  },
});
