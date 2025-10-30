import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    minify: false,
  },
  plugins: [preact()],
  server: {
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
});
