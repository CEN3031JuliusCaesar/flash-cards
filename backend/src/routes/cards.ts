import { Router } from "@oak/oak";
import { CARD_NOT_FOUND, FORBIDDEN, INVALID_REQUEST } from "./constants.ts";

import type { Database } from "@db/sqlite";
import { Snowflake } from "../utils/snowflake.ts";
import { getSession } from "../utils/sessionkey.ts";
import { updateStreakForUser } from "./user/streak.ts";
import type {
  CardProgressBasicView,
  CardsBasicView,
  SetsIdView,
  SetsOwnerView,
  StudyCardResult,
} from "../types/database.ts";
import { calculateAdjustedPoints } from "../utils/points.ts";

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

  // Update a card by ID - Allows the owner of the set to update card content
  router.patch("/:cardId", async (ctx) => {
    const username = await getSession(ctx, db);
    if (!username) return;

    const { cardId } = ctx.params;
    const { front, back } = await ctx.request.body.json();

    // Validate input fields if provided
    if (
      (typeof front !== "string" && front !== undefined) ||
      (typeof back !== "string" && back !== undefined)
    ) {
      ctx.response.body = {
        error: INVALID_REQUEST,
        message: "Front and back must be strings if provided",
      };
      ctx.response.status = 400;
      return;
    }

    // Ensure at least one field is provided to update
    if (front === undefined && back === undefined) {
      ctx.response.body = {
        error: INVALID_REQUEST,
        message:
          "At least one field (front or back) must be provided to update",
      };
      ctx.response.status = 400;
      return;
    }

    // Check if the card exists and get its set_id
    const cardInfo = db.sql<CardsBasicView>`
      SELECT id, set_id, front, back FROM Cards
      WHERE id = ${cardId};
    `;

    if (cardInfo.length === 0) {
      ctx.response.body = { error: CARD_NOT_FOUND };
      ctx.response.status = 404;
      return;
    }

    const set_id = cardInfo[0].set_id;

    // Check if user is authorized to edit this card (must be the set owner)
    const setInfo = db.sql<SetsOwnerView>`
      SELECT owner FROM Sets WHERE id = ${set_id};
    `;

    if (setInfo.length === 0) {
      ctx.response.body = { error: "SET_NOT_FOUND" };
      ctx.response.status = 404;
      return;
    }

    const setOwner = setInfo[0].owner;

    // Only the owner can edit the card
    if (setOwner !== username) {
      ctx.response.body = { error: FORBIDDEN };
      ctx.response.status = 403;
      return;
    }

    // Use the provided values or default to the existing values
    const newFront = front ?? cardInfo[0].front;
    const newBack = back ?? cardInfo[0].back;

    // Update the card with the new values
    db.sql`
      UPDATE Cards
      SET front = ${newFront}, back = ${newBack}
      WHERE id = ${cardId}
    `;

    // Get the updated card data
    const updatedCard = db.sql<CardsBasicView>`
      SELECT id, set_id, front, back FROM Cards
      WHERE id = ${cardId};
    `;

    ctx.response.body = updatedCard[0];
    ctx.response.status = 200;
  });

  // Delete a card by ID - Allows the owner of the set to delete a card
  router.delete("/:cardId", async (ctx) => {
    const username = await getSession(ctx, db);
    if (!username) return;

    const { cardId } = ctx.params;

    // Check if the card exists and get its set_id
    const cardInfo = db.sql<CardsBasicView>`
      SELECT id, set_id, front, back FROM Cards
      WHERE id = ${cardId};
    `;

    if (cardInfo.length === 0) {
      ctx.response.body = { error: CARD_NOT_FOUND };
      ctx.response.status = 404;
      return;
    }

    const set_id = cardInfo[0].set_id;

    // Check if user is authorized to delete this card (must be the set owner)
    const setInfo = db.sql<SetsOwnerView>`
      SELECT owner FROM Sets WHERE id = ${set_id};
    `;

    if (setInfo.length === 0) {
      ctx.response.body = { error: "SET_NOT_FOUND" };
      ctx.response.status = 404;
      return;
    }

    const setOwner = setInfo[0].owner;

    // Only the owner can delete the card
    if (setOwner !== username) {
      ctx.response.body = { error: FORBIDDEN };
      ctx.response.status = 403;
      return;
    }

    // Delete the card from Cards table
    db.sql`DELETE FROM Cards WHERE id = ${cardId};`;

    ctx.response.body = { id: cardId, message: "Card deleted successfully" };
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

    if (data.length > 0) {
      const now = Math.floor(Date.now() / 1000);
      const storedPoints = data[0].points;
      const lastReviewed = data[0].last_reviewed;

      const daysSinceLastReview = (now - lastReviewed) / (24 * 60 * 60);

      // Adjust points based on time elapsed since last review using the existing algorithm
      // This accounts for the natural decay of points when cards are not studied in time
      const currentPoints = calculateAdjustedPoints(
        storedPoints,
        daysSinceLastReview,
      );

      ctx.response.body = {
        points: currentPoints,
        last_reviewed: lastReviewed,
      };
    } else {
      ctx.response.body = {
        points: 0,
        last_reviewed: 0,
      }; // Return default progress when no progress exists
    }
    ctx.response.status = 200;
  });

  // update card progress after a study session - Updates points and last_reviewed based on study result
  router.post("/:cardId/study", async (ctx) => {
    const username = await getSession(ctx, db);
    if (!username) return;

    const { cardId } = ctx.params;

    // Validate request body
    const body = await ctx.request.body.json();
    const { result } = body;

    if (
      typeof result !== "string" || !["correct", "incorrect"].includes(result)
    ) {
      ctx.response.body = {
        error: INVALID_REQUEST,
        message: "Result must be 'correct' or 'incorrect'",
      };
      ctx.response.status = 400;
      return;
    }

    // Check if card exists
    const cardExists = db.sql<SetsIdView>`
      SELECT id FROM Cards
      WHERE id = ${cardId};
    `;

    if (cardExists.length === 0) {
      ctx.response.body = { error: CARD_NOT_FOUND };
      ctx.response.status = 404;
      return;
    }

    // Get current progress or create default
    const currentProgress = db.sql<CardProgressBasicView>`
      SELECT points, last_reviewed
      FROM CardProgress
      WHERE username = ${username} AND card_id = ${cardId};
    `;

    const now = Math.floor(Date.now() / 1000);
    const storedPoints = currentProgress.length > 0
      ? currentProgress[0].points
      : 0;
    const lastReviewed = currentProgress.length > 0
      ? currentProgress[0].last_reviewed
      : 0;

    // Calculate days since last review
    const daysSinceLastReview = (now - lastReviewed) / (24 * 60 * 60);

    // Adjust points based on time elapsed since last review using the existing algorithm
    // This accounts for the natural decay of points when cards are not studied in time
    const currentPoints = calculateAdjustedPoints(
      storedPoints,
      daysSinceLastReview,
    );

    // Verify that enough time has passed since last study (2^points days rule)
    // Only apply this validation if there was a previous review (not for new cards)
    const requiredDays = Math.pow(2, currentPoints);

    console.log(daysSinceLastReview, requiredDays);
    if (lastReviewed !== 0 && daysSinceLastReview <= requiredDays) {
      ctx.response.body = {
        error: "TOO_SOON",
        message: `Must wait ${
          Math.ceil(requiredDays - daysSinceLastReview)
        } more day(s) before reviewing again`,
        currentPoints,
        requiredDays,
        daysSinceLastReview,
      };
      ctx.response.status = 425; // Too Early status code
      return;
    }

    // Update points based on the study result
    let newPoints;
    if (result === "correct") {
      newPoints = currentPoints + 1;
    } else {
      newPoints = Math.max(0, currentPoints - 1); // Reset to 0 when incorrect
    }

    // Update or insert the card progress record
    try {
      db.sql`
        INSERT INTO CardProgress (username, card_id, points, last_reviewed)
        VALUES (${username}, ${cardId}, ${newPoints}, ${now})
        ON CONFLICT(username, card_id) DO UPDATE SET
          points = ${newPoints},
          last_reviewed = ${now}
      `;
    } catch (error) {
      ctx.response.body = {
        error: "FAILED_TO_UPDATE_PROGRESS",
        message: "Could not update card progress",
      };
      ctx.response.status = 500;
      console.error(error);
      return;
    }

    // Update user streak to reflect studying activity
    updateStreakForUser(db, username);

    // Respond with updated progress
    ctx.response.body = {
      cardId,
      result,
      oldPoints: currentPoints,
      newPoints,
      lastReviewed: now,
    } satisfies StudyCardResult;
    ctx.response.status = 200;
  });

  return router;
}
