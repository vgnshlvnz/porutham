import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Pages publishes under /porutham/. The Worker-hosted build leaves this unset and stays at /.
const base = process.env.VITE_BASE || "/";

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  server: {
    host: "127.0.0.1",
    port: 4321,
    proxy: {
      "/api": "http://127.0.0.1:8787",
    },
  },
});
