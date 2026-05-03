import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const rawFrontendPort = process.env.FRONTEND_PORT ?? "5173";
const frontendPort = Number(rawFrontendPort);

if (Number.isNaN(frontendPort) || frontendPort <= 0) {
  throw new Error(`Invalid FRONTEND_PORT value: "${rawFrontendPort}"`);
}

const rawApiPort = process.env.API_PORT ?? process.env.PORT ?? "3001";
const apiPort = Number(rawApiPort);

if (Number.isNaN(apiPort) || apiPort <= 0) {
  throw new Error(`Invalid API_PORT value: "${rawApiPort}"`);
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: frontendPort,
    strictPort: true,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: frontendPort,
    host: "0.0.0.0",
  },
});
