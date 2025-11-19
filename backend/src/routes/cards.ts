import { Router } from "@oak/oak";
import {
  INVALID_REQUEST,
  NO_SESSION_TOKEN,
  UNAUTHORIZED,
} from "./constants.ts";

import { Database } from "@db/sqlite";
import { Snowflake } from "../utils/snowflake.ts";
import { SessionResult } from "./sets.ts";

export function createCardRouter(db: Database) {
  const router = new Router();

  // Create a new card
  router.post("/", async (ctx) => {
    const session = await ctx.cookies.get("SESSION");

    if (session == null) {
      ctx.response.body = {
        error: NO_SESSION_TOKEN,
      };
      ctx.response.status = 403;
      return;
    }

    const username = db.sql<SessionResult>`
      SELECT username FROM Sessions
      WHERE token = ${session}
      AND expires > strftime('%s', 'now');
    `[0]?.username;

    if (username == null) {
      ctx.response.body = {
        error: UNAUTHORIZED,
      };
      ctx.response.status = 403;
      return;
    }

    const { set_id, front, back } = await ctx.request.body.json();

    // Validate required fields
    if (
      typeof set_id !== "string" || !set_id || typeof front !== "string" ||
      !front || typeof back !== "string" || !back
    ) {
      ctx.response.body = {
        error: INVALID_REQUEST,
      };
      ctx.response.status = 400;
      return;
    }

    // Check if user is authorized to add cards to this set (either owner or has edit permission)
    const setInfo = db.sql`
      SELECT owner FROM Sets WHERE id = ${set_id};
    `;

    if (setInfo.length === 0) {
      ctx.response.body = {
        error: "SET_NOT_FOUND",
      };
      ctx.response.status = 404;
      return;
    }

    const setOwner = setInfo[0].owner;

    // Check if user is the owner OR has CanEdit permission
    const isOwner = setOwner === username;
    const hasEditPermission = db.sql`
      SELECT 1 FROM CanEdit WHERE username = ${username} AND set_id = ${set_id};
    `.length > 0;

    if (!isOwner && !hasEditPermission) {
      ctx.response.body = {
        error: UNAUTHORIZED,
      };
      ctx.response.status = 403;
      return;
    }

    const cardId = Snowflake.generate();

    db.sql`
      INSERT INTO Cards (id, rowid_int, set_id, front, back)
      VALUES (${cardId}, ${
      BigInt("0x" + cardId)
    }, ${set_id}, ${front}, ${back});
    `;

    ctx.response.body = {
      id: cardId,
      set_id: set_id,
      front: front,
      back: back,
    };
    ctx.response.status = 200;
  });

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
    const session = await ctx.cookies.get("SESSION");

    if (session == null) {
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
      WHERE s.token = ${session}
        AND s.expires > strftime('%s', 'now')
        AND cp.card_id = ${cardId};
    `;

    ctx.response.body = data;
  });

  return router;
}
