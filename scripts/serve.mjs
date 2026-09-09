import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "out");
const PORT = Number(process.env.PORT || 43147);
const HOST = process.env.HOST || "0.0.0.0";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8",
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
  "Cross-Origin-Resource-Policy": "cross-origin",
  "Cross-Origin-Embedder-Policy": "unsafe-none",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { ...CORS, "Cache-Control": "no-store", ...headers });
  res.end(body);
}

function safeFile(urlPath) {
  let pathname = decodeURIComponent(urlPath.split("?")[0] || "/");
  if (pathname === "/") pathname = "/index.html";
  if (pathname.endsWith("/")) pathname += "index.html";
  const normalized = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  return path.join(ROOT, normalized);
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    send(res, 204, "");
    return;
  }

  const urlPath = req.url || "/";
  if (urlPath === "/health" || urlPath.startsWith("/health?")) {
    send(res, 200, "ok\n", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  let file = safeFile(urlPath);
  if (!file.startsWith(ROOT)) {
    send(res, 403, "forbidden\n", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(ROOT, "index.html");
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      send(res, 404, "not found\n", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }
    const ext = path.extname(file);
    send(res, 200, data, { "Content-Type": TYPES[ext] || "application/octet-stream" });
  });
});

server.on("error", (err) => {
  console.error(err);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  if (!fs.existsSync(path.join(ROOT, "index.html"))) {
    console.error(`Missing ${ROOT}/index.html. Run npm run build first.`);
    process.exit(1);
  }
  console.log(`宝宝听听 ready at http://127.0.0.1:${PORT}`);
});
