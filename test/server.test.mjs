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
    server.close();
    await once(server, "close");
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
