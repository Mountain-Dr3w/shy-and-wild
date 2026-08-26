import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const modulePath = fileURLToPath(import.meta.url);
const indexPath = fileURLToPath(new URL("./index.html", import.meta.url));
const publicPath = fileURLToPath(new URL("./public", import.meta.url));

const contentTypes = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const seoFiles = {
  "/robots.txt": {
    contentType: "text/plain; charset=utf-8",
    body: "User-agent: *\nAllow: /\nSitemap: https://shyandwild.com/sitemap.xml\n",
  },
  "/sitemap.xml": {
    contentType: "application/xml; charset=utf-8",
    body: '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://shyandwild.com/</loc></url>\n</urlset>\n',
  },
};

export function createAppServer() {
  return createServer(handleRequest);
}

async function handleRequest(request, response) {
  let pathname;

  try {
    pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  } catch {
    response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
    response.end("Invalid URL");
    return;
  }

  if (pathname === "/health") {
    response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ status: "ok" }));
    return;
  }

  if (seoFiles[pathname]) {
    const seoFile = seoFiles[pathname];
    response.writeHead(200, {
      "content-type": seoFile.contentType,
      "cache-control": "public, max-age=3600",
    });
    response.end(seoFile.body);
    return;
  }

  if (pathname.startsWith("/images/")) {
    let decodedPathname;

    try {
      decodedPathname = decodeURIComponent(pathname);
    } catch {
      response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      response.end("Invalid path");
      return;
    }

    const assetPath = resolve(publicPath, `.${decodedPathname}`);

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

  if (pathname !== "/" && pathname !== "/index.html") {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-cache",
  });
  createReadStream(indexPath).pipe(response);
}

if (resolve(process.argv[1] ?? "") === modulePath) {
  const server = createAppServer();

  server.listen(port, "0.0.0.0", () => {
    console.log(`Shy & Wild is listening on port ${port}`);
  });

  function shutdown() {
    server.close(() => process.exit(0));
  }

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
