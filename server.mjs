import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const modulePath = fileURLToPath(import.meta.url);
const indexPath = fileURLToPath(new URL("./index.html", import.meta.url));
const notFoundPath = fileURLToPath(new URL("./404.html", import.meta.url));
const publicPath = fileURLToPath(new URL("./public", import.meta.url));

const contentTypes = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".css": "text/css; charset=utf-8",
};

const pagePaths = new Map([
  ["/family-photography", fileURLToPath(new URL("./family.html", import.meta.url))],
  ["/couples-photography", fileURLToPath(new URL("./couples.html", import.meta.url))],
  ["/motherhood-photography", fileURLToPath(new URL("./motherhood.html", import.meta.url))],
  ["/privacy", fileURLToPath(new URL("./privacy.html", import.meta.url))],
]);

const seoFiles = {
  "/robots.txt": {
    contentType: "text/plain; charset=utf-8",
    body: "User-agent: *\nAllow: /\nSitemap: https://shyandwild.com/sitemap.xml\n",
  },
  "/sitemap.xml": {
    contentType: "application/xml; charset=utf-8",
    body: '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://shyandwild.com/</loc></url>\n  <url><loc>https://shyandwild.com/family-photography</loc></url>\n  <url><loc>https://shyandwild.com/couples-photography</loc></url>\n  <url><loc>https://shyandwild.com/motherhood-photography</loc></url>\n  <url><loc>https://shyandwild.com/privacy</loc></url>\n</urlset>\n',
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

  if (pathname.startsWith("/images/") || pathname.startsWith("/styles/")) {
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
      "cache-control": pathname.startsWith("/styles/")
        ? "no-cache"
        : "public, max-age=31536000, immutable",
    });
    createReadStream(assetPath).pipe(response);
    return;
  }

  const normalizedPagePath = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  if (pagePaths.has(normalizedPagePath)) {
    response.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-cache",
    });
    createReadStream(pagePaths.get(normalizedPagePath)).pipe(response);
    return;
  }

  if (pathname !== "/" && pathname !== "/index.html") {
    response.writeHead(404, { "content-type": "text/html; charset=utf-8" });
    createReadStream(notFoundPath).pipe(response);
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
