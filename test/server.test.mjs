import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";

import { createAppServer } from "../server.mjs";

async function withServer(run) {
  const server = createAppServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address();
    assert.notEqual(address, null);
    assert.equal(typeof address, "object");
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    const closed = new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    server.closeAllConnections();
    await closed;
  }
}

test("serves the homepage when Facebook adds tracking parameters", async () => {
  await withServer(async (origin) => {
    for (const path of ["/?fbclid=facebook-test", "/index.html?fbclid=facebook-test"]) {
      const response = await fetch(`${origin}${path}`, {
        headers: {
          "user-agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
        },
      });

      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type") ?? "", /^text\/html/);
      assert.match(await response.text(), /SHY &amp; WILD/);
    }
  });
});

test("ignores query strings for health checks and static assets", async () => {
  await withServer(async (origin) => {
    const healthResponse = await fetch(`${origin}/health?source=monitor`);
    assert.equal(healthResponse.status, 200);
    assert.deepEqual(await healthResponse.json(), { status: "ok" });

    const imageResponse = await fetch(`${origin}/images/woodland-couple.jpg?cache=facebook`);
    assert.equal(imageResponse.status, 200);
    assert.equal(imageResponse.headers.get("content-type"), "image/jpeg");
  });
});

test("serves crawl directives and a sitemap", async () => {
  await withServer(async (origin) => {
    const robotsResponse = await fetch(`${origin}/robots.txt`);
    assert.equal(robotsResponse.status, 200);
    assert.match(await robotsResponse.text(), /Sitemap: https:\/\/shyandwild\.com\/sitemap\.xml/);

    const sitemapResponse = await fetch(`${origin}/sitemap.xml`);
    assert.equal(sitemapResponse.status, 200);
    assert.match(sitemapResponse.headers.get("content-type") ?? "", /^application\/xml/);
    assert.match(await sitemapResponse.text(), /<loc>https:\/\/shyandwild\.com\/<\/loc>/);
    assert.match(await (await fetch(`${origin}/sitemap.xml`)).text(), /family-photography/);
  });
});

test("serves responsive portfolio assets and interactive booking features", async () => {
  await withServer(async (origin) => {
    const homeResponse = await fetch(origin);
    const home = await homeResponse.text();
    assert.match(home, /class="portfolio-lightbox"/);
    assert.match(home, /class="mobile-booking"/);
    assert.match(home, /data-track="full_session_booking"/);
    assert.match(home, /fallPromotionEnds/);
    assert.match(home, /woodland-couple-900\.webp 900w/);

    const imageResponse = await fetch(`${origin}/images/woodland-couple-900.webp`);
    assert.equal(imageResponse.status, 200);
    assert.equal(imageResponse.headers.get("content-type"), "image/webp");
  });
});

test("serves dedicated service, privacy, and branded not-found pages", async () => {
  await withServer(async (origin) => {
    for (const path of ["/family-photography", "/family-photography/", "/couples-photography", "/motherhood-photography", "/privacy"]) {
      const response = await fetch(`${origin}${path}`);
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type") ?? "", /^text\/html/);
    }

    const stylesResponse = await fetch(`${origin}/styles/site-pages.css`);
    assert.equal(stylesResponse.status, 200);
    assert.match(stylesResponse.headers.get("content-type") ?? "", /^text\/css/);

    const missingResponse = await fetch(`${origin}/this-page-does-not-exist`);
    assert.equal(missingResponse.status, 404);
    assert.match(await missingResponse.text(), /This page wandered off/);
  });
});
