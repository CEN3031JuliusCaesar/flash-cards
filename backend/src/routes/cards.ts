import { Router } from "@oak/oak";
import { NO_SESSION_TOKEN } from "./constants.ts";

import { Database } from "@db/sqlite";

export function createCardRouter(db: Database) {
  const router = new Router();

  // get card by ID - Returns the card details for the specified card ID
  router.get("/:cardId", (ctx) => {
    const { cardId } = ctx.params;

    const data = db.sql`
      SELECT * FROM Cards
      WHERE id = ${cardId};
    `;

    ctx.response.body = data;
  });

  // get card progress - Returns the progress data for a specific card based on user session
  router.get("/:cardId/progress", async (ctx) => {
    const SESSION = await ctx.cookies.get("SESSION");

    if (SESSION == null) {
      ctx.response.body = {
        error: NO_SESSION_TOKEN,
      };
      ctx.response.status = 401;
      return;
    }

    const { cardId } = ctx.params;

    const data = db.sql`
      SELECT cp.points, cp.last_reviewed
      FROM CardProgress cp
      JOIN Sessions s ON cp.username = s.username
      WHERE s.token = ${SESSION}
        AND s.expires > strftime('%s', 'now')
        AND cp.card_id = ${cardId};
    `;

    ctx.response.body = data;
  });

  return router;
}
