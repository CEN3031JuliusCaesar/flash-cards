import { Router } from "jsr:@oak/oak";
import { NO_SESSION_TOKEN } from "./constants.ts";
import { db } from "../db.ts";

export const cardsRouter = new Router();

cardsRouter.get("/", (ctx) => {
  ctx.response.body = "GET /cards";
  ctx.response.status = 404;
});

cardsRouter.get("/:setId/:cardId", (ctx) => {
  const { setId, cardId } = ctx.params;

  console.info(`GET /cards/${setId}/${cardId}`);
  const data = db.sql`
      SELECT * FROM Cards
      WHERE set_id = ${setId}
        AND id = ${cardId};
    `;

  ctx.response.body = data;
});

cardsRouter.get("/:setId/:cardId/progress", async (ctx) => {
  const SESSION = await ctx.cookies.get("SESSION");

  if (SESSION == null) {
    ctx.response.body = {
      error: NO_SESSION_TOKEN,
    };
    ctx.response.status = 404;
    return;
  }

  const { setId, cardId } = ctx.params;

  const data = db.sql`
      SELECT cp.points, cp.last_reviewed
      FROM CardProgress cp
      JOIN Sessions s ON cp.username = s.username
      WHERE s.token = ${SESSION}
        AND s.expires > strftime('%s', 'now')
        AND cp.set_id = ${setId}
        AND cp.card_id = ${cardId};
    `;

  ctx.response.body = data;
});
