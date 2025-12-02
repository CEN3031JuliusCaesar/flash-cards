import { Router } from "@oak/oak";
import type { Database } from "@db/sqlite";
import { getSession } from "../../utils/sessionkey.ts";
import type { StreakResult } from "../../types/database.ts";

// helper function to update user streak - updates the streak timestamps
export function updateStreakForUser(db: Database, username: string) {
  // get the current time
  const now = Math.floor(Date.now() / 1000);

  // update the streak timestamps
  const result = db.sql`
    UPDATE Users
    SET
      -- only set streak_start_date if this is the first update or the last update was >36 hours ago
      streak_start_date = CASE
        WHEN streak_last_updated IS NULL OR streak_last_updated < (${now} - 36 * 3600)
        THEN ${now}
        ELSE streak_start_date
      END,
      -- always update the last updated time to now
      streak_last_updated = ${now}
    WHERE username = ${username};
  `;

  return result;
}

export function createStreakRouter(db: Database) {
  const router = new Router();

  // get user streak - calculates the current streak based on date difference
  router.get("/", async (ctx) => {
    const username = await getSession(ctx, db);
    if (!username) return;

    const data = db.sql<StreakResult>`
      SELECT
        CASE
          -- if last updated is more than 36 hours ago, streak is 0
          WHEN u.streak_last_updated < (strftime('%s', 'now') - 36 * 3600) THEN 0
          -- if both dates exist, calculate the streak as the difference in days
          WHEN u.streak_start_date IS NOT NULL AND u.streak_last_updated IS NOT NULL THEN
            (strftime('%s', 'now') - u.streak_start_date) / 86400 + 1
          -- if start date is null but last updated is not, streak is 1
          WHEN u.streak_start_date IS NULL AND u.streak_last_updated IS NOT NULL THEN 1
          -- default to 0 if no streak data exists
          ELSE 0
        END AS current_streak
      FROM Users u
      WHERE u.username = ${username};
    `;

    ctx.response.body = data[0];
  });

  return router;
}
