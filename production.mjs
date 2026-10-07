import { spawn, spawnSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("DATABASE_URL is required. Connect a PostgreSQL database before starting the learning server.");
  process.exit(1);
}
if (!process.env.JWT_SECRET?.trim()) {
  console.error("JWT_SECRET is required. Configure a strong signing secret before starting the learning server.");
  process.exit(1);
}

const migrate = spawnSync("npm", ["--prefix", "server", "run", "prisma:deploy"], {
  stdio: "inherit",
  env: process.env
});

if (migrate.status !== 0) {
  process.exit(migrate.status ?? 1);
}

const api = spawn("node", ["dist/main.js"], {
  cwd: "server",
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "production", PORT: "3000" }
});

const web = spawn("node", ["server.mjs"], { stdio: "inherit", env: process.env });

function stop(signal) {
  api.kill(signal);
  web.kill(signal);
}
process.on("SIGTERM", () => stop("SIGTERM"));
process.on("SIGINT", () => stop("SIGINT"));
api.on("exit", (code) => { web.kill("SIGTERM"); process.exit(code ?? 1); });
web.on("exit", (code) => { api.kill("SIGTERM"); process.exit(code ?? 1); });
