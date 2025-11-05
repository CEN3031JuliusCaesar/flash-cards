import { Router } from "@oak/oak";
import { NO_SESSION_TOKEN } from "../constants.ts";
import { Database } from "@db/sqlite";

export function createStreakRouter(db: Database) {
  const router = new Router();

  // Get user streak - Returns the current streak for the authenticated user
  router.get("/", async (ctx) => {
    const SESSION = await ctx.cookies.get("SESSION");
    if (SESSION == null) {
      ctx.response.body = {
        error: NO_SESSION_TOKEN,
      };
      ctx.response.status = 404;
      return;
    }

    const data = db.sql`
      SELECT
          CASE
              WHEN u.streak_expire < (strftime('%s', 'now') - 48 * 3600) THEN 0
              ELSE u.streak
          END AS current_streak
      FROM Users u
      JOIN Sessions s ON u.username = s.username
      WHERE s.token = ${SESSION}
        AND s.expires > strftime('%s', 'now');
    `;

    ctx.response.body = data;
  });

  // Update user streak - Increments the user's streak if they're within the valid time window
  router.post("/update", async (ctx) => {
    const SESSION = await ctx.cookies.get("SESSION");
    if (SESSION == null) {
      ctx.response.body = {
        error: NO_SESSION_TOKEN,
      };
      ctx.response.status = 404;
      return;
    }

    const data = db.sql`
      UPDATE Users
      SET
          streak = streak + 1,
          streak_expire = strftime('%s', date('now'))
      WHERE username IN (
          SELECT username
          FROM Sessions
          WHERE token = ${SESSION}
            AND expires > strftime('%s', 'now')
      )
      AND streak_expire BETWEEN
          (strftime('%s', 'now') - 48 * 3600)
          AND (strftime('%s', 'now') - 24 * 3600);
    `;

    ctx.response.body = data;
  });

  return router;
}
