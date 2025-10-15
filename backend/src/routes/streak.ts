import { Router } from "jsr:@oak/oak";
import { NO_SESSION_TOKEN } from "./constants.ts";
import { db } from "../db.ts";

export const streakRouter = new Router();

streakRouter.get("/", async (ctx) => {
  const SESSION = await ctx.cookies.get("SESSION");
  if (SESSION == null) {
    ctx.response.body = {
      error: NO_SESSION_TOKEN,
    };
    ctx.response.status = 404;
    return;
  }

  console.info(`GET /streaks/`);

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

streakRouter.get("/update", async (ctx) => {
  const SESSION = await ctx.cookies.get("SESSION");
  if (SESSION == null) {
    ctx.response.body = {
      error: NO_SESSION_TOKEN,
    };
    ctx.response.status = 404;
    return;
  }
  console.info(`PUT /streaks/update`);

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
