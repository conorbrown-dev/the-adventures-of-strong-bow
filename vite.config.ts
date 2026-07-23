import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
    host: "0.0.0.0",
    // The Nest backend has its own development workflow. Excluding it keeps
    // Vite from exhausting the host's inotify watcher limit.
    watch: {
      ignored: ["**/server/**"]
    }
  }
});
