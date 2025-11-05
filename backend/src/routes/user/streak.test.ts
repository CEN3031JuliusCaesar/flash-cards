import { testing } from "@oak/oak";
import { assert, assertEquals } from "@std/assert";
import { initializeDB, memDB } from "../../db.ts";
import { createAPIRouter } from "../combined.ts";
import { NO_SESSION_TOKEN } from "../constants.ts";

const TEST_USERNAME = "testuser";
const TEST_EMAIL = "test@example.com";
const TEST_HASH = "hash";
const TEST_SALT = "salt";
const TEST_SESSION_TOKEN = "valid_session_token";
const HOURS_IN_SECONDS = 3600;
const ONE_DAY_IN_SECONDS = 86400;

Deno.test({
  name: "Streak w/o Session Fails",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const ctx = testing.createMockContext({
      path: "/api/user/streaks",
      method: "GET",
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 401);
    assertEquals(ctx.response.body, { error: NO_SESSION_TOKEN });
  },
});

Deno.test({
  name: "Streak returns streak",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const now = Math.floor(Date.now() / 1000);

    db.sql`
    INSERT INTO Users (username, email, hash, salt, streak, streak_expire)
    VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT}, ${5}, ${
      now - 12 * HOURS_IN_SECONDS
    })`;
    db.sql`
    INSERT INTO Sessions (username, token, expires)
    VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      now + HOURS_IN_SECONDS
    })`;

    const ctx = testing.createMockContext({
      path: "/api/user/streaks",
      method: "GET",
      headers: [["Cookie", `SESSION=${TEST_SESSION_TOKEN}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 200);
    assertEquals(ctx.response.body, [{ current_streak: 5 }]);
  },
});

Deno.test({
  name: "Streak is reset on expiration",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const now = Math.floor(Date.now() / 1000);

    // streak expired 50 hours ago
    db.sql`
    INSERT INTO Users (username, email, hash, salt, streak, streak_expire)
    VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT}, ${10}, ${
      now - 50 * HOURS_IN_SECONDS
    })`;
    db.sql`
    INSERT INTO Sessions (username, token, expires)
    VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      now + HOURS_IN_SECONDS
    })`;

    const ctx = testing.createMockContext({
      path: "/api/user/streaks",
      method: "GET",
      headers: [["Cookie", `SESSION=${TEST_SESSION_TOKEN}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 200);
    assertEquals(ctx.response.body, [{ current_streak: 0 }]);
  },
});

Deno.test({
  name: "Streaks update w/o session fails",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const ctx = testing.createMockContext({
      path: "/api/user/streaks/update",
      method: "POST",
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 401);
    assertEquals(ctx.response.body, { error: NO_SESSION_TOKEN });
  },
});

Deno.test({
  name: "Streak update works in range",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const now = Math.floor(Date.now() / 1000);

    db.sql`
    INSERT INTO Users (username, email, hash, salt, streak, streak_expire)
    VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT}, ${3}, ${
      now - 36 * HOURS_IN_SECONDS
    })`;
    db.sql`
    INSERT INTO Sessions (username, token, expires)
    VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      now + HOURS_IN_SECONDS
    })`;

    const ctx = testing.createMockContext({
      path: "/api/user/streaks/update",
      method: "POST",
      headers: [["Cookie", `SESSION=${TEST_SESSION_TOKEN}`]],
    });

    await mw(ctx, next);

    const updatedUser =
      db.sql`SELECT streak, streak_expire FROM Users WHERE username = ${TEST_USERNAME};`[
        0
      ];
    assertEquals(updatedUser.streak, 4);
    const expireTime = parseInt(updatedUser.streak_expire);
    assert(Math.abs(expireTime - now) < ONE_DAY_IN_SECONDS);

    assertEquals(ctx.response.status, 200);
    assertEquals(ctx.response.body, []);
  },
});

Deno.test({
  name: "Streak update does nothing if early",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const now = Math.floor(Date.now() / 1000);

    db.sql`
    INSERT INTO Users (username, email, hash, salt, streak, streak_expire)
    VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT}, ${2}, ${
      now - 12 * HOURS_IN_SECONDS
    })`;
    db.sql`
    INSERT INTO Sessions (username, token, expires)
    VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      now + HOURS_IN_SECONDS
    })`;

    const ctx = testing.createMockContext({
      path: "/api/user/streaks/update",
      method: "POST",
      headers: [["Cookie", `SESSION=${TEST_SESSION_TOKEN}`]],
    });

    await mw(ctx, next);

    const updatedUser =
      db.sql`SELECT streak FROM Users WHERE username = ${TEST_USERNAME};`[0];
    assertEquals(updatedUser.streak, 2);

    assertEquals(ctx.response.status, 200);
    assertEquals(ctx.response.body, []);
  },
});

Deno.test({
  name: "Streak resets after 48h",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const now = Math.floor(Date.now() / 1000);

    db.sql`
    INSERT INTO Users (username, email, hash, salt, streak, streak_expire)
    VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT}, ${7}, ${
      now - 60 * HOURS_IN_SECONDS
    })`;
    db.sql`
    INSERT INTO Sessions (username, token, expires)
    VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      now + HOURS_IN_SECONDS
    })`;

    const ctx = testing.createMockContext({
      path: "/api/user/streaks/update",
      method: "POST",
      headers: [["Cookie", `SESSION=${TEST_SESSION_TOKEN}`]],
    });

    await mw(ctx, next);

    const updatedUser =
      db.sql`SELECT streak FROM Users WHERE username = ${TEST_USERNAME};`[0];
    assertEquals(updatedUser.streak, 7);

    assertEquals(ctx.response.status, 200);
    assertEquals(ctx.response.body, []);
  },
});
