import { testing } from "@oak/oak";
import { assertEquals } from "@std/assert";
import { initializeDB, memDB } from "../db.ts";
import { createAPIRouter } from "./combined.ts";
import { NO_SESSION_TOKEN } from "./constants.ts";

const TEST_USERNAME = "testuser";
const TEST_EMAIL = "testemail@service.webemail";
const TEST_SALT = "73616c74"; // hex for 'salt'
const TEST_HASH =
  "c297e57206c7aee60fe2ede4bee13021542d0d472fa690c76557cdccf8610cc6cc63ff0d6f6a2f6433c577c5326d3023aabdedd04e453b43bfe1fd1ccc9cb728";
const TEST_SESSION_TOKEN = "token";
const TEST_SET_ID = "1111111111111111";
const TEST_SET_TITLE = "Test Set";
const TEST_CARD_ID = "1234123412341234";
const TEST_CARD_FRONT = "Front";
const TEST_CARD_BACK = "Back";
const TEST_CARD_ID_2 = "1234123412341235";
const TEST_CARD_FRONT_2 = "Front2";
const TEST_CARD_BACK_2 = "Back2";

Deno.test({
  name: "Create Set - Success",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      Date.now() + 60 * 60 * 24
    })`;

    const ctx = testing.createMockContext({
      path: "/api/sets/create",
      method: "POST",
      headers: [["Cookie", `SESSION=${TEST_SESSION_TOKEN}`]],
      body: ReadableStream.from([JSON.stringify({ title: TEST_SET_TITLE })]),
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 200);
  },
});

Deno.test({
  name: "Create Set - No Session",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      Date.now() + 60 * 60 * 24
    })`;

    const ctx = testing.createMockContext({
      path: "/api/sets/create",
      method: "POST",
      body: ReadableStream.from([JSON.stringify({ title: TEST_SET_TITLE })]),
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 403);
  },
});

Deno.test({
  name: "Create Set - Invalid Request",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      Date.now() + 60 * 60 * 24
    })`;

    const ctx = testing.createMockContext({
      path: "/api/sets/create",
      method: "POST",
      headers: [["Cookie", `SESSION=${TEST_SESSION_TOKEN}`]],
      body: ReadableStream.from([
        JSON.stringify({
          title: "012345678901234567890123456789012345678901234567890123456789",
        }),
      ]), // Long title not permitted.
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 400);
  },
});

Deno.test({
  name: "Delete set - Success",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${TEST_SET_ID}, ${TEST_USERNAME}, ${TEST_SET_TITLE})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      Date.now() + 60 * 60 * 24
    })`;

    const ctx = testing.createMockContext({
      path: `/api/sets/${TEST_SET_ID}`,
      method: "DELETE",
      headers: [["Cookie", `SESSION=${TEST_SESSION_TOKEN}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 200);
  },
});

Deno.test({
  name: "Delete set - No Session",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${TEST_SET_ID}, ${TEST_USERNAME}, ${TEST_SET_TITLE})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      Date.now() + 60 * 60 * 24
    })`;

    const ctx = testing.createMockContext({
      path: `/api/sets/${TEST_SET_ID}`,
      method: "DELETE",
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 403);
  },
});

Deno.test({
  name: "Delete set - Not Owner",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${
      TEST_USERNAME + "hi"
    }, ${TEST_EMAIL + "hi"}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${TEST_SET_ID}, ${TEST_USERNAME}, ${TEST_SET_TITLE})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${
      TEST_USERNAME + "hi"
    }, ${TEST_SESSION_TOKEN}, ${Date.now() + 60 * 60 * 24})`;

    const ctx = testing.createMockContext({
      path: `/api/sets/${TEST_SET_ID}`,
      method: "DELETE",
      headers: [["Cookie", `SESSION=${TEST_SESSION_TOKEN}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 403);
  },
});

Deno.test({
  name: "Delete set - Invalid ID",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${TEST_SET_ID}, ${TEST_USERNAME}, ${TEST_SET_TITLE})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      Date.now() + 60 * 60 * 24
    })`;

    const ctx = testing.createMockContext({
      path: `/api/sets/${TEST_SET_ID + "lmnop"}`,
      method: "DELETE",
      headers: [["Cookie", `SESSION=${TEST_SESSION_TOKEN}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 400);
  },
});

Deno.test({
  name: "Delete set - Nonexistent Set",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${TEST_SET_ID}, ${TEST_USERNAME}, ${TEST_SET_TITLE})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      Date.now() + 60 * 60 * 24
    })`;

    const ctx = testing.createMockContext({
      path: `/api/sets/${"1111111111111112"}`,
      method: "DELETE",
      headers: [["Cookie", `SESSION=${TEST_SESSION_TOKEN}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 404);
  },
});

Deno.test({
  name: "Update set - Success (Title)",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${TEST_SET_ID}, ${TEST_USERNAME}, ${TEST_SET_TITLE})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      Date.now() + 60 * 60 * 24
    })`;

    const ctx = testing.createMockContext({
      path: `/api/sets/${TEST_SET_ID}`,
      method: "PATCH",
      headers: [["Cookie", `SESSION=${TEST_SESSION_TOKEN}`]],
      body: ReadableStream.from([
        JSON.stringify({ newTitle: "New Title", newOwner: TEST_USERNAME }),
      ]),
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, {
      id: TEST_SET_ID,
      owner: TEST_USERNAME,
      title: "New Title",
    });
    assertEquals(ctx.response.status, 200);
  },
});

Deno.test({
  name: "Update set - Success (Owner)",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${
      TEST_USERNAME + "hi"
    }, ${TEST_EMAIL + "hi"}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${TEST_SET_ID}, ${TEST_USERNAME}, ${TEST_SET_TITLE})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      Date.now() + 60 * 60 * 24
    })`;

    const ctx = testing.createMockContext({
      path: `/api/sets/${TEST_SET_ID}`,
      method: "PATCH",
      headers: [["Cookie", `SESSION=${TEST_SESSION_TOKEN}`]],
      body: ReadableStream.from([
        JSON.stringify({
          newTitle: TEST_SET_TITLE,
          newOwner: TEST_USERNAME + "hi",
        }),
      ]),
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, {
      id: TEST_SET_ID,
      owner: TEST_USERNAME + "hi",
      title: TEST_SET_TITLE,
    });
    assertEquals(ctx.response.status, 200);
  },
});

Deno.test({
  name: "Update set - No Session",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${TEST_SET_ID}, ${TEST_USERNAME}, ${TEST_SET_TITLE})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      Date.now() + 60 * 60 * 24
    })`;

    const ctx = testing.createMockContext({
      path: `/api/sets/${TEST_SET_ID}`,
      method: "PATCH",
      body: ReadableStream.from([
        JSON.stringify({ newTitle: "New Title", newOwner: TEST_USERNAME }),
      ]),
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 403);
  },
});

Deno.test({
  name: "Update set - Not owner",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${
      TEST_USERNAME + "hi"
    }, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${TEST_SET_ID}, ${TEST_USERNAME}, ${TEST_SET_TITLE})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${
      TEST_USERNAME + "hi"
    }, ${TEST_SESSION_TOKEN}, ${Date.now() + 60 * 60 * 24})`;

    const ctx = testing.createMockContext({
      path: `/api/sets/${TEST_SET_ID}`,
      method: "PATCH",
      headers: [["Cookie", `SESSION=${TEST_SESSION_TOKEN}`]],
      body: ReadableStream.from([
        JSON.stringify({ newTitle: "New Title", newOwner: TEST_USERNAME }),
      ]),
    });

    await mw(ctx, next);
    assertEquals(ctx.response.status, 403);
  },
});

Deno.test({
  name: "Update set - Nonexistent set",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${TEST_SET_ID}, ${TEST_USERNAME}, ${TEST_SET_TITLE})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      Date.now() + 60 * 60 * 24
    })`;

    const ctx = testing.createMockContext({
      path: `/api/sets/${"1111111111111112"}`,
      method: "PATCH",
      headers: [["Cookie", `SESSION=${TEST_SESSION_TOKEN}`]],
      body: ReadableStream.from([
        JSON.stringify({ newTitle: "New Title", newOwner: TEST_USERNAME }),
      ]),
    });

    await mw(ctx, next);
    assertEquals(ctx.response.status, 404);
  },
});

Deno.test({
  name: "Get Set by ID - Success",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${TEST_SET_ID}, ${TEST_USERNAME}, ${TEST_SET_TITLE})`;
    db.sql`INSERT INTO Cards (id, set_id, front, back) VALUES (${TEST_CARD_ID}, ${TEST_SET_ID}, ${TEST_CARD_FRONT}, ${TEST_CARD_BACK})`;

    const ctx = testing.createMockContext({
      path: `/api/sets/${TEST_SET_ID}`,
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, {
      id: TEST_SET_ID,
      owner: TEST_USERNAME,
      title: TEST_SET_TITLE,
      cards: [{
        id: TEST_CARD_ID,
        set_id: TEST_SET_ID,
        front: TEST_CARD_FRONT,
        back: TEST_CARD_BACK,
      }],
    });
  },
});

Deno.test({
  name: "Get Set by ID - Not Found",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const ctx = testing.createMockContext({
      path: `/api/sets/nonexistent`,
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, { error: "Set not found" });
    assertEquals(ctx.response.status, 404);
  },
});

Deno.test({
  name: "Track Set - Success",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${TEST_SET_ID}, ${TEST_USERNAME}, ${TEST_SET_TITLE})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      Date.now() + 60 * 60 * 24
    })`;

    const ctx = testing.createMockContext({
      path: `/api/sets/${TEST_SET_ID}/track`,
      method: "POST",
      headers: [["Cookie", `SESSION=${TEST_SESSION_TOKEN}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, { message: "Set successfully tracked" });
    assertEquals(ctx.response.status, 200);

    const trackedSets = db
      .sql`SELECT username, set_id FROM TrackedSets WHERE username = ${TEST_USERNAME}`;
    assertEquals(trackedSets, [{
      username: TEST_USERNAME,
      set_id: TEST_SET_ID,
    }]);
  },
});

Deno.test({
  name: "Track Set - Already Tracked",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${TEST_SET_ID}, ${TEST_USERNAME}, ${TEST_SET_TITLE})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      Date.now() + 60 * 60 * 24
    })`;
    db.sql`INSERT INTO TrackedSets (username, set_id) VALUES (${TEST_USERNAME}, ${TEST_SET_ID})`;

    const ctx = testing.createMockContext({
      path: `/api/sets/${TEST_SET_ID}/track`,
      method: "POST",
      headers: [["Cookie", `SESSION=${TEST_SESSION_TOKEN}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, { message: "Set already tracked" });
    assertEquals(ctx.response.status, 200);
  },
});

Deno.test({
  name: "Track Set - No Session",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${TEST_SET_ID}, ${TEST_USERNAME}, ${TEST_SET_TITLE})`;

    const ctx = testing.createMockContext({
      path: `/api/sets/${TEST_SET_ID}/track`,
      method: "POST",
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, { error: NO_SESSION_TOKEN });
    assertEquals(ctx.response.status, 401);
  },
});

Deno.test({
  name: "Track Set - Invalid Session",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${TEST_SET_ID}, ${TEST_USERNAME}, ${TEST_SET_TITLE})`;

    const ctx = testing.createMockContext({
      path: `/api/sets/${TEST_SET_ID}/track`,
      method: "POST",
      headers: [["Cookie", `SESSION=invalidtoken`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, { error: "Invalid session" });
    assertEquals(ctx.response.status, 401);
  },
});

Deno.test({
  name: "Track Set - Set Not Found",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      Date.now() + 60 * 60 * 24
    })`;

    const ctx = testing.createMockContext({
      path: `/api/sets/nonexistent/track`,
      method: "POST",
      headers: [["Cookie", `SESSION=${TEST_SESSION_TOKEN}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, { error: "Set not found" });
    assertEquals(ctx.response.status, 404);
  },
});

Deno.test({
  name: "Untrack Set - Success",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${TEST_SET_ID}, ${TEST_USERNAME}, ${TEST_SET_TITLE})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      Date.now() + 60 * 60 * 24
    })`;
    db.sql`INSERT INTO TrackedSets (username, set_id) VALUES (${TEST_USERNAME}, ${TEST_SET_ID})`;

    const ctx = testing.createMockContext({
      path: `/api/sets/${TEST_SET_ID}/untrack`,
      method: "DELETE",
      headers: [["Cookie", `SESSION=${TEST_SESSION_TOKEN}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, { message: "Set successfully untracked" });
    assertEquals(ctx.response.status, 200);

    const trackedSets = db
      .sql`SELECT username, set_id FROM TrackedSets WHERE username = ${TEST_USERNAME}`;
    assertEquals(trackedSets, []);
  },
});

Deno.test({
  name: "Untrack Set - Not Tracked",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${TEST_SET_ID}, ${TEST_USERNAME}, ${TEST_SET_TITLE})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      Date.now() + 60 * 60 * 24
    })`;

    const ctx = testing.createMockContext({
      path: `/api/sets/${TEST_SET_ID}/untrack`,
      method: "DELETE",
      headers: [["Cookie", `SESSION=${TEST_SESSION_TOKEN}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, { message: "Set was not being tracked" });
    assertEquals(ctx.response.status, 200);
  },
});

Deno.test({
  name: "Check if Set is Tracked - True",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${TEST_SET_ID}, ${TEST_USERNAME}, ${TEST_SET_TITLE})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      Date.now() + 60 * 60 * 24
    })`;
    db.sql`INSERT INTO TrackedSets (username, set_id) VALUES (${TEST_USERNAME}, ${TEST_SET_ID})`;

    const ctx = testing.createMockContext({
      path: `/api/sets/${TEST_SET_ID}/tracked`,
      method: "GET",
      headers: [["Cookie", `SESSION=${TEST_SESSION_TOKEN}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, { isTracked: true });
    assertEquals(ctx.response.status, 200);
  },
});

Deno.test({
  name: "Check if Set is Tracked - False",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${TEST_SET_ID}, ${TEST_USERNAME}, ${TEST_SET_TITLE})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      Date.now() + 60 * 60 * 24
    })`;

    const ctx = testing.createMockContext({
      path: `/api/sets/${TEST_SET_ID}/tracked`,
      method: "GET",
      headers: [["Cookie", `SESSION=${TEST_SESSION_TOKEN}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, { isTracked: false });
    assertEquals(ctx.response.status, 200);
  },
});

Deno.test({
  name: "Get Tracked Sets - Success with No Sets Tracked",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      Date.now() + 60 * 60 * 24
    })`;

    const ctx = testing.createMockContext({
      path: `/api/sets/tracked`,
      method: "GET",
      headers: [["Cookie", `SESSION=${TEST_SESSION_TOKEN}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, {
      id: "combined-pseudo-set",
      owner: TEST_USERNAME,
      title: "Tracked Sets Combined",
      cards: [],
    });
    assertEquals(ctx.response.status, 200);
  },
});

Deno.test({
  name: "Get Tracked Sets - Success with Tracked Sets",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${TEST_SET_ID}, ${TEST_USERNAME}, ${TEST_SET_TITLE})`;
    db.sql`INSERT INTO Cards (id, set_id, front, back) VALUES (${TEST_CARD_ID}, ${TEST_SET_ID}, ${TEST_CARD_FRONT}, ${TEST_CARD_BACK})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      Date.now() + 60 * 60 * 24
    })`;
    db.sql`INSERT INTO TrackedSets (username, set_id) VALUES (${TEST_USERNAME}, ${TEST_SET_ID})`;

    const ctx = testing.createMockContext({
      path: `/api/sets/tracked`,
      method: "GET",
      headers: [["Cookie", `SESSION=${TEST_SESSION_TOKEN}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, {
      id: "combined-pseudo-set",
      owner: TEST_USERNAME,
      title: "Tracked Sets Combined",
      cards: [{
        id: TEST_CARD_ID,
        set_id: TEST_SET_ID,
        front: TEST_CARD_FRONT,
        back: TEST_CARD_BACK,
      }],
    });
    assertEquals(ctx.response.status, 200);
  },
});

Deno.test({
  name: "Get Tracked Sets - No Session",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const ctx = testing.createMockContext({
      path: `/api/sets/tracked`,
      method: "GET",
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, { error: NO_SESSION_TOKEN });
    assertEquals(ctx.response.status, 401);
  },
});

Deno.test({
  name: "Get Set by ID with Study - No Session",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const ctx = testing.createMockContext({
      path: `/api/sets/${TEST_SET_ID}?study=true`,
      method: "GET",
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, { error: NO_SESSION_TOKEN });
    assertEquals(ctx.response.status, 401);
  },
});

Deno.test({
  name: "Get Set by ID with Study - Success (study=true) - Card Needs Studying",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${TEST_SET_ID}, ${TEST_USERNAME}, ${TEST_SET_TITLE})`;
    // insert a card that needs studying (old last_reviewed time, low points)
    const oldTime = Math.floor(Date.now() / 1000) - 100000;
    db.sql`INSERT INTO Cards (id, set_id, front, back) VALUES (${TEST_CARD_ID}, ${TEST_SET_ID}, ${TEST_CARD_FRONT}, ${TEST_CARD_BACK})`;
    db.sql`INSERT INTO CardProgress (username, card_id, points, last_reviewed) VALUES (${TEST_USERNAME}, ${TEST_CARD_ID}, ${0}, ${oldTime})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      Date.now() + 60 * 60 * 24
    })`;

    const ctx = testing.createMockContext({
      path: `/api/sets/${TEST_SET_ID}?study=true`,
      method: "GET",
      headers: [["Cookie", `SESSION=${TEST_SESSION_TOKEN}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, {
      id: TEST_SET_ID,
      owner: TEST_USERNAME,
      title: TEST_SET_TITLE,
      cards: [{
        id: TEST_CARD_ID,
        set_id: TEST_SET_ID,
        front: TEST_CARD_FRONT,
        back: TEST_CARD_BACK,
      }],
    });
  },
});

Deno.test({
  name: "Get Set by ID with Study - Success (study=true) - No Cards to Study",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${TEST_SET_ID}, ${TEST_USERNAME}, ${TEST_SET_TITLE})`;
    // insert a card that doesn't need studying (recent last_reviewed time, high points)
    const recentTime = Math.floor(Date.now() / 1000);
    db.sql`INSERT INTO Cards (id, set_id, front, back) VALUES (${TEST_CARD_ID}, ${TEST_SET_ID}, ${TEST_CARD_FRONT}, ${TEST_CARD_BACK})`;
    db.sql`INSERT INTO CardProgress (username, card_id, points, last_reviewed) VALUES (${TEST_USERNAME}, ${TEST_CARD_ID}, ${10}, ${recentTime})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      Date.now() + 60 * 60 * 24
    })`;

    const ctx = testing.createMockContext({
      path: `/api/sets/${TEST_SET_ID}?study=true`,
      method: "GET",
      headers: [["Cookie", `SESSION=${TEST_SESSION_TOKEN}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, {
      id: TEST_SET_ID,
      owner: TEST_USERNAME,
      title: TEST_SET_TITLE,
      cards: [],
    });
  },
});

Deno.test({
  name: "Get Set by ID with Study - Success (study=5) - With Points Offset",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${TEST_SET_ID}, ${TEST_USERNAME}, ${TEST_SET_TITLE})`;
    // insert a card where with offset 5 it needs to be studied
    const recentTime = Math.floor(Date.now() / 1000) - 10000;
    db.sql`INSERT INTO Cards (id, set_id, front, back) VALUES (${TEST_CARD_ID}, ${TEST_SET_ID}, ${TEST_CARD_FRONT}, ${TEST_CARD_BACK})`;
    db.sql`INSERT INTO CardProgress (username, card_id, points, last_reviewed) VALUES (${TEST_USERNAME}, ${TEST_CARD_ID}, ${0}, ${recentTime})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      Date.now() + 60 * 60 * 24
    })`;

    const ctx = testing.createMockContext({
      path: `/api/sets/${TEST_SET_ID}?study=5`,
      method: "GET",
      headers: [["Cookie", `SESSION=${TEST_SESSION_TOKEN}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, {
      id: TEST_SET_ID,
      owner: TEST_USERNAME,
      title: TEST_SET_TITLE,
      cards: [{
        id: TEST_CARD_ID,
        set_id: TEST_SET_ID,
        front: TEST_CARD_FRONT,
        back: TEST_CARD_BACK,
      }],
    });
  },
});

Deno.test({
  name: "Get Tracked Sets with Study - Success (study=true) - Multiple Sets",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT})`;

    const set2Id = "2222222222222222";
    const set2Title = "Test Set 2";
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${TEST_SET_ID}, ${TEST_USERNAME}, ${TEST_SET_TITLE})`;
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${set2Id}, ${TEST_USERNAME}, ${set2Title})`;

    db.sql`INSERT INTO Cards (id, set_id, front, back) VALUES (${TEST_CARD_ID}, ${TEST_SET_ID}, ${TEST_CARD_FRONT}, ${TEST_CARD_BACK})`;
    db.sql`INSERT INTO Cards (id, set_id, front, back) VALUES (${TEST_CARD_ID_2}, ${set2Id}, ${TEST_CARD_FRONT_2}, ${TEST_CARD_BACK_2})`;

    // card progress that makes them need studying
    const oldTime = Math.floor(Date.now() / 1000) - 100000;
    db.sql`INSERT INTO CardProgress (username, card_id, points, last_reviewed) VALUES (${TEST_USERNAME}, ${TEST_CARD_ID}, ${0}, ${oldTime})`;
    db.sql`INSERT INTO CardProgress (username, card_id, points, last_reviewed) VALUES (${TEST_USERNAME}, ${TEST_CARD_ID_2}, ${0}, ${oldTime})`;

    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      Date.now() + 60 * 60 * 24
    })`;

    db.sql`INSERT INTO TrackedSets (username, set_id) VALUES (${TEST_USERNAME}, ${TEST_SET_ID})`;
    db.sql`INSERT INTO TrackedSets (username, set_id) VALUES (${TEST_USERNAME}, ${set2Id})`;

    const ctx = testing.createMockContext({
      path: `/api/sets/tracked?study=true`,
      method: "GET",
      headers: [["Cookie", `SESSION=${TEST_SESSION_TOKEN}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, {
      id: "combined-pseudo-set",
      owner: TEST_USERNAME,
      title: "Tracked Sets Combined",
      cards: [
        {
          id: TEST_CARD_ID,
          set_id: TEST_SET_ID,
          front: TEST_CARD_FRONT,
          back: TEST_CARD_BACK,
        },
        {
          id: TEST_CARD_ID_2,
          set_id: set2Id,
          front: TEST_CARD_FRONT_2,
          back: TEST_CARD_BACK_2,
        },
      ],
    });
    assertEquals(ctx.response.status, 200);
  },
});

Deno.test({
  name: "Untrack Set - Invalid Session",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${TEST_SET_ID}, ${TEST_USERNAME}, ${TEST_SET_TITLE})`;

    const ctx = testing.createMockContext({
      path: `/api/sets/${TEST_SET_ID}/untrack`,
      method: "DELETE",
      headers: [["Cookie", `SESSION=invalidtoken`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, { error: "Invalid session" });
    assertEquals(ctx.response.status, 401);
  },
});

Deno.test({
  name: "Check if Set is Tracked - Invalid Session",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT})`;
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${TEST_SET_ID}, ${TEST_USERNAME}, ${TEST_SET_TITLE})`;

    const ctx = testing.createMockContext({
      path: `/api/sets/${TEST_SET_ID}/tracked`,
      method: "GET",
      headers: [["Cookie", `SESSION=invalidtoken`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, { error: "Invalid session" });
    assertEquals(ctx.response.status, 401);
  },
});

Deno.test({
  name: "Get Tracked Sets - Invalid Session",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const ctx = testing.createMockContext({
      path: `/api/sets/tracked`,
      method: "GET",
      headers: [["Cookie", `SESSION=invalidtoken`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, { error: "Invalid session" });
    assertEquals(ctx.response.status, 401);
  },
});
