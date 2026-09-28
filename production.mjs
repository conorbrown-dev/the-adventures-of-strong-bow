import { spawn, spawnSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL ?? "";
const hasProductionDatabase = databaseUrl.length > 0 && !databaseUrl.includes("localhost:5432");
let api;

if (hasProductionDatabase) {
  const migrate = spawnSync("npm", ["--prefix", "server", "run", "prisma:deploy"], {
    stdio: "inherit",
    env: process.env
  });

  if (migrate.status !== 0) {
    process.exit(migrate.status ?? 1);
  }

  api = spawn("node", ["dist/main.js"], {
    cwd: "server",
    stdio: "inherit",
    env: { ...process.env, PORT: "3000" }
  });
} else {
  console.warn("No production database is configured; serving the learning game in demo mode.");
}

const web = spawn("node", ["server.mjs"], { stdio: "inherit", env: process.env });

function stop(signal) {
  api?.kill(signal);
  web.kill(signal);
}
process.on("SIGTERM", () => stop("SIGTERM"));
process.on("SIGINT", () => stop("SIGINT"));
api?.on("exit", (code) => { web.kill("SIGTERM"); process.exit(code ?? 1); });
web.on("exit", (code) => { api?.kill("SIGTERM"); process.exit(code ?? 1); });
