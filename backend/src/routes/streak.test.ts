import { testing } from "@oak/oak";
import { assert, assertEquals } from "@std/assert";
import { initializeDB, memDB } from "../db.ts";
import { createAPIRouter } from "./combined.ts";
import { NO_SESSION_TOKEN } from "./constants.ts";

Deno.test({
  name: "Streak w/o Session Fails",
  async fn() {
    const db = memDB();
    initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const ctx = testing.createMockContext({
      path: "/api/streaks",
      method: "GET",
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 404);
    assertEquals(ctx.response.body, { error: NO_SESSION_TOKEN });
  },
});

Deno.test({
  name: "Streak returns streak",
  async fn() {
    const db = memDB();
    initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const testUsername = "testuser";
    const testSession = "valid_session_token";
    const now = Math.floor(Date.now() / 1000);

    db.sql`INSERT INTO Users (username, email, hash, salt, streak, streak_expire)
           VALUES (${testUsername}, ${"test@example.com"}, ${"hash"}, ${"salt"}, ${5}, ${
      now - 12 * 3600
    })`;
    db.sql`INSERT INTO Sessions (username, token, expires)
           VALUES (${testUsername}, ${testSession}, ${now + 3600})`;

    const ctx = testing.createMockContext({
      path: "/api/streaks",
      method: "GET",
      headers: [["Cookie", `SESSION=${testSession}`]],
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
    initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const testUsername = "testuser";
    const testSession = "valid_session_token";
    const now = Math.floor(Date.now() / 1000);

    // streak expired 50 hours ago
    db.sql`INSERT INTO Users (username, email, hash, salt, streak, streak_expire)
           VALUES (${testUsername}, ${"test@example.com"}, ${"hash"}, ${"salt"}, ${10}, ${
      now - 50 * 3600
    })`;
    db.sql`INSERT INTO Sessions (username, token, expires)
           VALUES (${testUsername}, ${testSession}, ${now + 3600})`;

    const ctx = testing.createMockContext({
      path: "/api/streaks",
      method: "GET",
      headers: [["Cookie", `SESSION=${testSession}`]],
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
    initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const ctx = testing.createMockContext({
      path: "/api/streaks/update",
      method: "POST",
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 404);
    assertEquals(ctx.response.body, { error: NO_SESSION_TOKEN });
  },
});

Deno.test({
  name: "Streak update works in range",
  async fn() {
    const db = memDB();
    initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const testUsername = "testuser";
    const testSession = "valid_session_token";
    const now = Math.floor(Date.now() / 1000);

    db.sql`INSERT INTO Users (username, email, hash, salt, streak, streak_expire)
           VALUES (${testUsername}, ${"test@example.com"}, ${"hash"}, ${"salt"}, ${3}, ${
      now - 36 * 3600
    })`;
    db.sql`INSERT INTO Sessions (username, token, expires)
           VALUES (${testUsername}, ${testSession}, ${now + 3600})`;

    const ctx = testing.createMockContext({
      path: "/api/streaks/update",
      method: "POST",
      headers: [["Cookie", `SESSION=${testSession}`]],
    });

    await mw(ctx, next);

    const updatedUser =
      db.sql`SELECT streak, streak_expire FROM Users WHERE username = ${testUsername};`[
        0
      ];
    assertEquals(updatedUser.streak, 4);
    const expireTime = parseInt(updatedUser.streak_expire);
    assert(Math.abs(expireTime - now) < 86400);

    assertEquals(ctx.response.status, 200);
    assertEquals(ctx.response.body, []);
  },
});

Deno.test({
  name: "Streak update does nothing if early",
  async fn() {
    const db = memDB();
    initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const testUsername = "testuser";
    const testSession = "valid_session_token";
    const now = Math.floor(Date.now() / 1000);

    db.sql`INSERT INTO Users (username, email, hash, salt, streak, streak_expire)
           VALUES (${testUsername}, ${"test@example.com"}, ${"hash"}, ${"salt"}, ${2}, ${
      now - 12 * 3600
    })`;
    db.sql`INSERT INTO Sessions (username, token, expires)
           VALUES (${testUsername}, ${testSession}, ${now + 3600})`;

    const ctx = testing.createMockContext({
      path: "/api/streaks/update",
      method: "POST",
      headers: [["Cookie", `SESSION=${testSession}`]],
    });

    await mw(ctx, next);

    const updatedUser =
      db.sql`SELECT streak FROM Users WHERE username = ${testUsername};`[0];
    assertEquals(updatedUser.streak, 2);

    assertEquals(ctx.response.status, 200);
    assertEquals(ctx.response.body, []);
  },
});

Deno.test({
  name: "Streak resets after 48h",
  async fn() {
    const db = memDB();
    initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const testUsername = "testuser";
    const testSession = "valid_session_token";
    const now = Math.floor(Date.now() / 1000);

    db.sql`INSERT INTO Users (username, email, hash, salt, streak, streak_expire)
           VALUES (${testUsername}, ${"test@example.com"}, ${"hash"}, ${"salt"}, ${7}, ${
      now - 60 * 3600
    })`;
    db.sql`INSERT INTO Sessions (username, token, expires)
           VALUES (${testUsername}, ${testSession}, ${now + 3600})`;

    const ctx = testing.createMockContext({
      path: "/api/streaks/update",
      method: "POST",
      headers: [["Cookie", `SESSION=${testSession}`]],
    });

    await mw(ctx, next);

    const updatedUser =
      db.sql`SELECT streak FROM Users WHERE username = ${testUsername};`[0];
    assertEquals(updatedUser.streak, 7);

    assertEquals(ctx.response.status, 200);
    assertEquals(ctx.response.body, []);
  },
});
