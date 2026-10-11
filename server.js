import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const publicRoot = resolve(projectRoot, "public");
const sourceRoot = resolve(projectRoot, "src");
const port = Number(globalThis.process?.env?.PORT) || 3000;
const host = globalThis.process?.env?.HOST || "0.0.0.0";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webm": "video/webm"
};

/** Resolves a request URL to an allowed static file path. */
function resolveRequestPath(requestUrl = "/") {
  const pathname = decodeURIComponent(new URL(requestUrl, "http://localhost").pathname);

  if (pathname === "/") {
    return join(publicRoot, "index.html");
  }

  const isSourceFile = pathname.startsWith("/src/");
  const root = isSourceFile ? sourceRoot : publicRoot;
  const relativePath = isSourceFile ? pathname.slice(5) : pathname.slice(1);
  const filePath = resolve(root, normalize(relativePath));
  const isInsideRoot = filePath === root || filePath.startsWith(`${root}${sep}`);

  return isInsideRoot ? filePath : null;
}

/** Sends a small plain-text error response. */
function sendError(response, statusCode, message) {
  response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(message);
}

/** Serves one static asset while preventing path traversal. */
async function handleRequest(request, response) {
  const filePath = resolveRequestPath(request.url);

  if (!filePath) {
    sendError(response, 403, "Forbidden");
    return;
  }

  try {
    const content = await readFile(filePath);
    const contentType = mimeTypes[extname(filePath).toLowerCase()] ?? "application/octet-stream";
    response.writeHead(200, {
      "Cache-Control": "no-cache",
      "Content-Type": contentType
    });
    response.end(content);
  } catch (error) {
    const statusCode = error.code === "ENOENT" ? 404 : 500;
    sendError(response, statusCode, statusCode === 404 ? "Not found" : "Server error");
  }
}

/** Reports the local development address after the server starts. */
function handleListen() {
  console.log(`FD Culinary is listening on ${host}:${port}`);
}

const server = createServer(handleRequest);
server.listen(port, host, handleListen);
