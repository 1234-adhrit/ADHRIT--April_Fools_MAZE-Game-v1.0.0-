const http = require("http");
const fs = require("fs");
const path = require("path");

const port = Number(process.env.PORT) || 3000;
const rootDir = __dirname;
const rootPrefix = `${rootDir}${path.sep}`;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

function resolveRequestPath(urlPath) {
  const pathname = urlPath === "/" ? "/index.html" : decodeURIComponent(urlPath);
  const resolvedPath = path.resolve(rootDir, `.${pathname}`);
  if (!resolvedPath.startsWith(rootPrefix)) {
    return null;
  }
  return resolvedPath;
}

function sendFile(filePath, response, method) {
  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      sendNotFound(response);
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[extension] || "application/octet-stream";

    response.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": stats.size
    });

    if (method === "HEAD") {
      response.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.on("error", () => sendServerError(response));
    stream.pipe(response);
  });
}

function sendNotFound(response) {
  response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("404 Not Found");
}

function sendMethodNotAllowed(response) {
  response.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("Method Not Allowed");
}

function sendServerError(response) {
  if (response.headersSent) {
    response.destroy();
    return;
  }
  response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("500 Internal Server Error");
}

const server = http.createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    sendMethodNotAllowed(response);
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const filePath = resolveRequestPath(url.pathname);

  if (!filePath) {
    sendNotFound(response);
    return;
  }

  sendFile(filePath, response, request.method);
});

server.listen(port, () => {
  console.log(`April Fools Maze server running on http://localhost:${port}`);
});
