import { Router } from "@oak/oak";
import { CARD_NOT_FOUND, FORBIDDEN, INVALID_REQUEST } from "./constants.ts";

import type { Database } from "@db/sqlite";
import { Snowflake } from "../utils/snowflake.ts";
import { getSession } from "../utils/sessionkey.ts";
import type {
  CardProgressBasicView,
  CardsBasicView,
  SetsIdView,
  SetsOwnerView,
} from "../types/database.ts";

export function createCardRouter(db: Database) {
  const router = new Router();

  // Create a new card
  router.post("/create", async (ctx) => {
    const username = await getSession(ctx, db);
    if (!username) return;

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
    const setInfo = db.sql<SetsOwnerView>`
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

    if (!isOwner) {
      ctx.response.body = {
        error: FORBIDDEN,
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

    const data = db.sql<CardsBasicView>`
      SELECT id, set_id, front, back FROM Cards
      WHERE id = ${cardId};
    `;

    if (data.length === 0) {
      ctx.response.body = { error: CARD_NOT_FOUND };
      ctx.response.status = 404;
      return;
    }

    ctx.response.body = data[0]; // Return single card object instead of array
    ctx.response.status = 200;
  });

  // get card progress - Returns the progress data for a specific card based on user session
  router.get("/:cardId/progress", async (ctx) => {
    const username = await getSession(ctx, db);
    if (!username) return;

    const { cardId } = ctx.params;

    // First check if the card exists
    const cardExists = db.sql<SetsIdView>`
      SELECT id FROM Cards
      WHERE id = ${cardId};
    `;

    if (cardExists.length === 0) {
      ctx.response.body = { error: CARD_NOT_FOUND };
      ctx.response.status = 404;
      return;
    }

    const data = db.sql<CardProgressBasicView>`
      SELECT cp.points, cp.last_reviewed
      FROM CardProgress cp
      WHERE cp.username = ${username}
        AND cp.card_id = ${cardId};
    `;

    // If progress data exists, return the first record; otherwise return default values
    if (data.length > 0) {
      ctx.response.body = data[0]; // Return single progress object instead of array
    } else {
      ctx.response.body = {
        points: 0,
        last_reviewed: 0,
      }; // Return default progress when no progress exists
    }
    ctx.response.status = 200;
  });

  return router;
}
