import http from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, "dist");
const indexFile = path.join(distDir, "index.html");
const host = "0.0.0.0";
const port = Number(process.env.PORT || 8080);

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".gif", "image/gif"],
  [".svg", "image/svg+xml"],
  [".ico", "image/x-icon"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
  [".ttf", "font/ttf"],
  [".txt", "text/plain; charset=utf-8"],
  [".map", "application/json; charset=utf-8"]
]);

function sendFile(filePath, response, statusCode = 200) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType =
    contentTypes.get(ext) || "application/octet-stream";

  response.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable"
  });

  createReadStream(filePath).pipe(response);
}

function safePathname(requestUrl) {
  const parsedUrl = new URL(requestUrl, `http://${host}:${port}`);
  const decodedPath = decodeURIComponent(parsedUrl.pathname);
  const normalizedPath = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, "");
  return normalizedPath === path.sep ? "/index.html" : normalizedPath;
}

const server = http.createServer(async (request, response) => {
  try {
    const pathname = safePathname(request.url || "/");
    const requestedPath = path.join(distDir, pathname);
    const filePath = requestedPath.startsWith(distDir) ? requestedPath : indexFile;

    if (existsSync(filePath)) {
      const fileStat = await stat(filePath);
      if (fileStat.isFile()) {
        sendFile(filePath, response);
        return;
      }
    }

    sendFile(indexFile, response);
  } catch (error) {
    response.writeHead(500, {
      "Content-Type": "text/plain; charset=utf-8"
    });
    response.end("Server error");
    console.error(error);
  }
});

server.listen(port, host, () => {
  console.log(`Accepting connections at http://${host}:${port}`);
});
