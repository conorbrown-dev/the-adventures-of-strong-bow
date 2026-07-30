import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    proxy: {
      "/api": "http://localhost:3000"
    },
    port: 5173,
    host: "0.0.0.0",
    // The Nest backend has its own development workflow. Excluding it keeps
    // Vite from exhausting the host's inotify watcher limit.
    watch: {
      ignored: ["**/server/**"]
    }
  }
});
