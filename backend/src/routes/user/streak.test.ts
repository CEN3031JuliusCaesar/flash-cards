import { testing } from "@oak/oak";
import { assertEquals } from "@std/assert";
import { initializeDB, memDB } from "../../db.ts";
import { createAPIRouter } from "../combined.ts";
import { NO_SESSION_TOKEN } from "../constants.ts";
import { updateStreakForUser } from "./streak.ts";

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
    INSERT INTO Users (username, email, hash, salt, streak_start_date, streak_last_updated)
    VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT}, ${
      now - 2 * ONE_DAY_IN_SECONDS // Started 2 days ago
    }, ${now})`; // Last updated now
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

    // With 2 days between start and now, streak should be 3 (2 days + 1)
    assertEquals(ctx.response.status, 200);
    assertEquals(ctx.response.body, [{ current_streak: 3 }]);
  },
});

Deno.test({
  name: "Streak is reset on expiration (more than 36 hours)",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const now = Math.floor(Date.now() / 1000);

    // Last updated 40 hours ago (more than 36 hours)
    db.sql`
    INSERT INTO Users (username, email, hash, salt, streak_start_date, streak_last_updated)
    VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT}, ${
      now - 3 * ONE_DAY_IN_SECONDS // Started 3 days ago
    }, ${now - 40 * HOURS_IN_SECONDS})`;
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
  name: "Streak update works and sets start date if no previous streak",
  async fn() {
    const db = memDB();
    await initializeDB(db);

    // User with no previous streak data
    const now = Math.floor(Date.now() / 1000);
    db.sql`
    INSERT INTO Users (username, email, hash, salt, streak_start_date, streak_last_updated)
    VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT}, NULL, NULL)`;

    updateStreakForUser(db, TEST_USERNAME);

    const updatedUser =
      db.sql`SELECT streak_start_date, streak_last_updated FROM Users WHERE username = ${TEST_USERNAME};`[
        0
      ];
    assertEquals(Number(updatedUser.streak_start_date), now);
    assertEquals(Number(updatedUser.streak_last_updated), now);
  },
});

Deno.test({
  name: "Streak update continues existing streak if within 36 hours",
  async fn() {
    const db = memDB();
    await initializeDB(db);

    const now = Math.floor(Date.now() / 1000);

    // User with existing streak (started 2 days ago, last updated 10 hours ago)
    db.sql`
    INSERT INTO Users (username, email, hash, salt, streak_start_date, streak_last_updated)
    VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT}, ${
      now - 2 * ONE_DAY_IN_SECONDS // Started 2 days ago
    }, ${now - 10 * HOURS_IN_SECONDS})`; // Last updated 10 hours ago

    // Use the helper function directly
    updateStreakForUser(db, TEST_USERNAME);

    const updatedUser =
      db.sql`SELECT streak_start_date, streak_last_updated FROM Users WHERE username = ${TEST_USERNAME};`[
        0
      ];
    // Start date should remain the same since we're continuing the streak
    assertEquals(
      Number(updatedUser.streak_start_date),
      now - 2 * ONE_DAY_IN_SECONDS,
    );
    // Last updated should be now
    assertEquals(Number(updatedUser.streak_last_updated), now);
  },
});

Deno.test({
  name: "Streak reset after more than 36 hours",
  async fn() {
    const db = memDB();
    await initializeDB(db);

    const now = Math.floor(Date.now() / 1000);

    // User with existing streak but last updated more than 36 hours ago (40 hours ago)
    db.sql`
    INSERT INTO Users (username, email, hash, salt, streak_start_date, streak_last_updated)
    VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT}, ${
      now - 3 * ONE_DAY_IN_SECONDS // Started 3 days ago
    }, ${now - 40 * HOURS_IN_SECONDS})`; // Last updated 40 hours ago

    updateStreakForUser(db, TEST_USERNAME);

    const updatedUser =
      db.sql`SELECT streak_start_date, streak_last_updated FROM Users WHERE username = ${TEST_USERNAME};`[
        0
      ];
    // Start date should be reset to now since the old streak expired
    assertEquals(Number(updatedUser.streak_start_date), now);
    // Last updated should be now
    assertEquals(Number(updatedUser.streak_last_updated), now);
  },
});
