import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const indexPath = fileURLToPath(new URL("./index.html", import.meta.url));
const publicPath = fileURLToPath(new URL("./public", import.meta.url));

const contentTypes = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const server = createServer(async (request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ status: "ok" }));
    return;
  }

  if (request.url?.startsWith("/images/")) {
    const assetPath = resolve(publicPath, `.${decodeURIComponent(request.url)}`);

    if (!assetPath.startsWith(`${publicPath}/`)) {
      response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      response.end("Invalid path");
      return;
    }

    try {
      const assetStat = await stat(assetPath);
      if (!assetStat.isFile()) throw new Error("Not a file");
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const contentType = contentTypes[extname(assetPath)] ?? "application/octet-stream";
    response.writeHead(200, {
      "content-type": contentType,
      "cache-control": "public, max-age=31536000, immutable",
    });
    createReadStream(assetPath).pipe(response);
    return;
  }

  if (request.url !== "/" && request.url !== "/index.html") {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-cache",
  });
  createReadStream(indexPath).pipe(response);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Shy & Wild is listening on port ${port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
