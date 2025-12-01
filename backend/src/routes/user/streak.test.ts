import { testing } from "@oak/oak";
import { assertEquals } from "@std/assert";
import { initializeDB, memDB } from "../../db.ts";
import { createAPIRouter } from "../combined.ts";
import { NO_SESSION_TOKEN } from "../constants.ts";
import { createSession, createUser, mockDateNow } from "../../utils/testing.ts";
import { updateStreakForUser } from "./streak.ts";

const HOURS_IN_SECONDS = 3600;
const ONE_DAY_IN_SECONDS = 24 * HOURS_IN_SECONDS;

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

    const user = await createUser(db);
    // Manually update the user's streak information since createUser doesn't set these fields
    db.sql`
    UPDATE Users
    SET
      streak_start_date = ${now - 2 * ONE_DAY_IN_SECONDS},
      streak_last_updated = ${now}
    WHERE username = ${user.username}`;

    const session = await createSession(db, user);

    const ctx = testing.createMockContext({
      path: "/api/user/streaks",
      method: "GET",
      headers: [["Cookie", `SESSION=${session.token}`]],
    });

    await mw(ctx, next);

    // With 2 days between start and now, streak should be 3 (2 days + 1)
    assertEquals(ctx.response.status, 200);
    assertEquals(ctx.response.body, { current_streak: 3 });
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

    const user = await createUser(db);
    // Manually update the user's streak information since createUser doesn't set these fields
    db.sql`
    UPDATE Users
    SET
      streak_start_date = ${now - 3 * ONE_DAY_IN_SECONDS},
      streak_last_updated = ${now - 40 * HOURS_IN_SECONDS}
    WHERE username = ${user.username}`;

    const session = await createSession(db, user);

    const ctx = testing.createMockContext({
      path: "/api/user/streaks",
      method: "GET",
      headers: [["Cookie", `SESSION=${session.token}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 200);
    assertEquals(ctx.response.body, { current_streak: 0 });
  },
});

Deno.test({
  name: "Streak update works and sets start date if no previous streak",
  async fn() {
    using _ = mockDateNow();
    const db = memDB();
    await initializeDB(db);

    // Create user with default streak values (null)
    const user = await createUser(db);

    // Manually reset the streak information to null since createUser might set default values
    db.sql`
    UPDATE Users
    SET
      streak_start_date = NULL,
      streak_last_updated = NULL
    WHERE username = ${user.username}`;

    // User with no previous streak data
    const now = Math.floor(Date.now() / 1000);

    updateStreakForUser(db, user.username);

    const updatedUser = db.sql<
      { streak_start_date: number | null; streak_last_updated: number | null }
    >`SELECT streak_start_date, streak_last_updated FROM Users WHERE username = ${user.username};`[
      0
    ];
    assertEquals(Number(updatedUser.streak_start_date), now);
    assertEquals(Number(updatedUser.streak_last_updated), now);
  },
});

Deno.test({
  name: "Streak update continues existing streak if within 36 hours",
  async fn() {
    using _ = mockDateNow();

    const db = memDB();
    await initializeDB(db);

    const now = Math.floor(Date.now() / 1000);

    // Create user and manually update their streak data
    const user = await createUser(db);
    db.sql`
    UPDATE Users
    SET
      streak_start_date = ${now - 2 * ONE_DAY_IN_SECONDS},
      streak_last_updated = ${now - 10 * HOURS_IN_SECONDS}
    WHERE username = ${user.username}`;

    // Use the helper function directly
    updateStreakForUser(db, user.username);

    const updatedUser = db.sql<
      { streak_start_date: number | null; streak_last_updated: number | null }
    >`SELECT streak_start_date, streak_last_updated FROM Users WHERE username = ${user.username};`[
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
    using _ = mockDateNow();
    const db = memDB();
    await initializeDB(db);

    const now = Math.floor(Date.now() / 1000);

    // Create user and manually update their streak data with last updated more than 36 hours ago
    const user = await createUser(db);
    db.sql`
    UPDATE Users
    SET
      streak_start_date = ${now - 3 * ONE_DAY_IN_SECONDS},
      streak_last_updated = ${now - 40 * HOURS_IN_SECONDS}
    WHERE username = ${user.username}`;

    updateStreakForUser(db, user.username);

    const updatedUser = db.sql<
      { streak_start_date: number | null; streak_last_updated: number | null }
    >`SELECT streak_start_date, streak_last_updated FROM Users WHERE username = ${user.username};`[
      0
    ];
    // Start date should be reset to now since the old streak expired
    assertEquals(Number(updatedUser.streak_start_date), now);
    // Last updated should be now
    assertEquals(Number(updatedUser.streak_last_updated), now);
  },
});
