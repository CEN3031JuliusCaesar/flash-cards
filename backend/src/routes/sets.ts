//TODO: Use Date.now() instead of strftime so expirations actually work.
//TODO: Extract session validation to a helper function.
import { Router } from "@oak/oak";
import {
  INVALID_REQUEST,
  NO_SESSION_TOKEN,
  UNAUTHORIZED,
} from "./constants.ts";

import { Snowflake } from "../utils/snowflake.ts";
import { Database } from "@db/sqlite";

export function createSetsRouter(db: Database) {
  const router = new Router();

  /**
 * Create a new set.
 * Requires a valid SESSION cookie. Set will be added to authed user's account.
 * Request JSON must include the value "title" which is the title of the set (max 50 characters).
 * Returns the set object:
 * {
    id: SNOWFLAKE,
    owner: USERNAME,
    title: title,
  }
 */
  router.post("/create", async (ctx) => {

    const SESSION = await ctx.cookies.get("SESSION");
    

    if (SESSION == null) {
      ctx.response.body = {
        error: NO_SESSION_TOKEN,
      };
      ctx.response.status = 403;
      return;
    }

    const USERNAME = db.sql`SELECT username FROM Sessions
      WHERE token = ${SESSION}
      AND expires > strftime('%s', 'now');`[0]?.username;
    
    if (USERNAME === undefined) {
      ctx.response.body = {
        error: UNAUTHORIZED,
      };
      ctx.response.status = 403;
      return;
    }
    
  
    const { title } = await ctx.request.body.json();

    if (typeof title !== "string" || title.length === 0 || title.length > 50) {
      ctx.response.body = {
        error: INVALID_REQUEST,
      };
      ctx.response.status = 400;
      return;
    }

    const SNOWFLAKE = Snowflake.generate();

    db.sql`INSERT INTO Sets (id, owner, title)
  VALUES (${SNOWFLAKE}, ${USERNAME}, ${title});`;

    ctx.response.body = {
      id: SNOWFLAKE,
      owner: USERNAME,
      title: title,
    };
    ctx.response.status = 200;
  });

  router.delete("/:setId", async (ctx) => {
    const { setId } = ctx.params;


    const SESSION = await ctx.cookies.get("SESSION");

    if (SESSION == null) {
      ctx.response.body = {
        error: NO_SESSION_TOKEN,
      };
      ctx.response.status = 403;
      return;
    }

    const USERNAME = db.sql`SELECT username FROM Sessions
      WHERE token = ${SESSION}
      AND expires > strftime('%s', 'now');`[0]?.username;
    
    // Must be set owner to delete.
    if (USERNAME == undefined) {
      ctx.response.body = {
        error: UNAUTHORIZED,
      };
      ctx.response.status = 403;
      return;
    }

    // Validate setId is a snowflake.
    if (!Snowflake.isSnowflake(setId!)) {
      ctx.response.body = {
        error: "INVALID_SET_ID",
      };
      ctx.response.status = 400;
      return;
    }

    const SET = db.sql`SELECT * FROM Sets
    WHERE id = ${setId}
    AND owner = ${USERNAME};`;

    // Validate that the set exists & is owned.
    if (SET.length === 0) {
      if(db.sql`SELECT * FROM Sets WHERE id = ${setId};`.length > 0) {
        ctx.response.body = {
          error: UNAUTHORIZED,
        };
        ctx.response.status = 403;
      } else {
        ctx.response.body = {
          error: "SET_NOT_FOUND",
        };
        ctx.response.status = 404;
      }
      return;
    }

    db.sql`DELETE FROM Sets
  WHERE id = ${setId};`;

    ctx.response.body = {
      id: setId,
    };
    ctx.response.status = 200;
  });

  /**
   * Update a set's owner or title. If you want to update one or the other, just put the old one in the request JSON.
   */
  router.patch("/:setId", async (ctx) => {
    const { setId } = ctx.params;


    const SESSION = await ctx.cookies.get("SESSION");

    // Session authorization.
    if (SESSION == null) {
      ctx.response.body = {
        error: NO_SESSION_TOKEN,
      };
      ctx.response.status = 403;
      return;
    }


    const USERNAME = db.sql`SELECT username FROM Sessions
      WHERE token = ${SESSION}
      AND expires > strftime('%s', 'now');`[0]?.username;

    if (USERNAME == undefined) {
      ctx.response.body = {
        error: UNAUTHORIZED,
      };
      ctx.response.status = 403;
      return;
    }

    // Validate setId is a snowflake.
    if (!Snowflake.isSnowflake(setId!)) {
      ctx.response.body = {
        error: "INVALID_SET_ID",
      };
      ctx.response.status = 400;
      return;
    }

    const SET = db.sql`SELECT * FROM Sets
    WHERE id = ${setId}
    AND Owner = ${USERNAME};`;

    // Validate that the set exists.
    if (SET.length === 0) {
      if(db.sql`SELECT * FROM Sets WHERE id = ${setId};`.length > 0) {
        ctx.response.body = {
          error: UNAUTHORIZED,
        };
        ctx.response.status = 403;
      } else {
        ctx.response.body = {
          error: "SET_NOT_FOUND",
        };
        ctx.response.status = 404;
      }
      return;
    }


    const { newOwner, newTitle } = await ctx.request.body.json();

    // Validate newOwner is valid username.
    if (
      typeof newOwner !== "string" || newOwner.length === 0 ||
      newOwner.length > 32 ||
      db.sql`SELECT * FROM Users WHERE username = ${newOwner};`[0] == undefined
    ) {
      ctx.response.body = {
        error: INVALID_REQUEST,
      };
      ctx.response.status = 400;
      return;
    }

    // Validate newTitle is valid title.
    if (
      typeof newTitle !== "string" || newTitle.length === 0 ||
      newTitle.length > 50
    ) {
      ctx.response.body = {
        error: INVALID_REQUEST,
      };
      ctx.response.status = 400;
      return;
    }

    db.sql`UPDATE Sets
  SET owner = ${newOwner}, title = ${newTitle}
  WHERE id = ${setId};`;

    ctx.response.body = {
      id: setId,
      owner: newOwner,
      title: newTitle,
    };
    ctx.response.status = 200;
    return;
  });

  // get all tracked sets for user with study option as a single combined set
  router.get("/tracked", async (ctx) => {
    const studyParam = ctx.request.url.searchParams.get("study");
    const study = studyParam !== null ? studyParam : null;

    const sessionToken = await ctx.cookies.get("SESSION");
    if (sessionToken == null) {
      ctx.response.body = {
        error: NO_SESSION_TOKEN,
      };
      ctx.response.status = 401;
      return;
    }

    const username = db.sql`
        SELECT s.username
        FROM Sessions s
        WHERE s.token = ${sessionToken}
          AND s.expires > strftime('%s', 'now');
      `;

    if (!username || username.length === 0) {
      ctx.response.body = { error: "Invalid session" };
      ctx.response.status = 401;
      return;
    }

    const user = username[0].username;

    const trackedSets = db.sql`
        SELECT s.id, s.owner, s.title
        FROM Sets s
        INNER JOIN TrackedSets ts ON s.id = ts.set_id
        WHERE ts.username = ${user};
      `;

    // Create a combined pseudo-set to hold all cards
    const combinedSet = {
      id: "combined-pseudo-set",
      owner: user,
      title: "Tracked Sets Combined",
      cards: [] as {
        id: string;
        set_id: string;
        front: string;
        back: string;
      }[],
    };

    if (study !== null) {
      // Get relevant cards for all tracked sets and combine them
      let pointsOffset = 0;
      if (study !== "true") {
        const parsedOffset = parseInt(study);
        if (!isNaN(parsedOffset)) {
          pointsOffset = parsedOffset;
        }
      }

      // Pass offset as negative to make cards appear to have fewer points,
      // making them due for review more frequently
      for (const set of trackedSets) {
        const cards = getRelevantCards(db, user, set.id, -pointsOffset);
        combinedSet.cards.push(...cards);
      }
    } else {
      for (const set of trackedSets) {
        const cards: {
          id: string;
          set_id: string;
          front: string;
          back: string;
        }[] = db.sql`
            SELECT c.id, c.set_id, c.front, c.back
            FROM Cards c
            WHERE c.set_id = ${set.id};
          `;
        combinedSet.cards.push(...cards);
      }
    }

    ctx.response.body = combinedSet;
  });

  // get set from id with study option
  router.get("/:setId", async (ctx) => {
    const { setId } = ctx.params;
    const studyParam = ctx.request.url.searchParams.get("study");
    const study = studyParam !== null ? studyParam : null;

    let sessionToken = null;
    if (study !== null) {
      sessionToken = await ctx.cookies.get("SESSION");
      if (sessionToken == null) {
        ctx.response.body = {
          error: NO_SESSION_TOKEN,
        };
        ctx.response.status = 401;
        return;
      }
    }

    const setInfo = db.sql`
        SELECT s.id, s.owner, s.title
        FROM Sets s
        WHERE s.id = ${setId};
      `;

    if (!setInfo || setInfo.length === 0) {
      ctx.response.body = { error: "Set not found" };
      ctx.response.status = 404;
      return;
    }

    const response = {
      id: setInfo[0].id,
      owner: setInfo[0].owner,
      title: setInfo[0].title,
    } as {
      id: string;
      owner: string;
      title: string;
      cards?: { id: string; set_id: string; front: string; back: string }[];
    };

    let cards: { id: string; set_id: string; front: string; back: string }[] =
      [];

    if (study !== null) {
      // only send cards that need studying
      const username = db.sql`
          SELECT s.username
          FROM Sessions s
          WHERE s.token = ${sessionToken}
            AND s.expires > strftime('%s', 'now');
        `;

      if (!username || username.length === 0) {
        ctx.response.body = { error: "Invalid session" };
        ctx.response.status = 401;
        return;
      }

      const user = username[0].username;

      let pointsOffset = 0;
      if (study !== "true") {
        const parsedOffset = parseInt(study);
        if (!isNaN(parsedOffset)) {
          pointsOffset = parsedOffset;
        }
      }

      // Pass offset as negative to make cards appear to have fewer points,
      // making them due for review more frequently
      cards = getRelevantCards(db, user, setId, -pointsOffset);
    } else {
      cards = db.sql`
          SELECT c.id, c.set_id, c.front, c.back
          FROM Cards c
          WHERE c.set_id = ${setId};
        `;
    }

    response.cards = cards;

    ctx.response.body = response;
  });

  // track a set for a user
  router.post("/:setId/track", async (ctx) => {
    const { setId } = ctx.params;
    const sessionToken = await ctx.cookies.get("SESSION");

    if (sessionToken == null) {
      ctx.response.body = {
        error: NO_SESSION_TOKEN,
      };
      ctx.response.status = 401;
      return;
    }

    const usernameResult = db.sql`
        SELECT s.username
        FROM Sessions s
        WHERE s.token = ${sessionToken}
          AND s.expires > strftime('%s', 'now');
      `;

    if (!usernameResult || usernameResult.length === 0) {
      ctx.response.body = { error: "Invalid session" };
      ctx.response.status = 401;
      return;
    }

    const user = usernameResult[0].username;

    const setInfo = db.sql`
        SELECT id
        FROM Sets
        WHERE id = ${setId};
      `;

    if (!setInfo || setInfo.length === 0) {
      ctx.response.body = { error: "Set not found" };
      ctx.response.status = 404;
      return;
    }

    try {
      db.sql`
          INSERT INTO TrackedSets (username, set_id)
          VALUES (${user}, ${setId})
        `;

      ctx.response.status = 200;
      ctx.response.body = { message: "Set successfully tracked" };
    } catch (error: unknown) {
      // double-track is fine
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed")
      ) {
        ctx.response.status = 200;
        ctx.response.body = { message: "Set already tracked" };
      } else {
        ctx.response.status = 500;
        ctx.response.body = { error: "Failed to track set" };
      }
    }
  });

  // untrack set
  router.delete("/:setId/untrack", async (ctx) => {
    const { setId } = ctx.params;
    const sessionToken = await ctx.cookies.get("SESSION");

    if (sessionToken == null) {
      ctx.response.body = {
        error: NO_SESSION_TOKEN,
      };
      ctx.response.status = 401;
      return;
    }

    const usernameResult = db.sql`
        SELECT s.username
        FROM Sessions s
        WHERE s.token = ${sessionToken}
          AND s.expires > strftime('%s', 'now');
      `;

    if (!usernameResult || usernameResult.length === 0) {
      ctx.response.body = { error: "Invalid session" };
      ctx.response.status = 401;
      return;
    }

    const user = usernameResult[0].username;

    const setInfo = db.sql`
        SELECT id
        FROM Sets
        WHERE id = ${setId};
      `;

    if (!setInfo || setInfo.length === 0) {
      ctx.response.body = { error: "Set not found" };
      ctx.response.status = 404;
      return;
    }

    // Delete the tracking relationship and check how many rows were affected
    db.sql`
        DELETE FROM TrackedSets
        WHERE username = ${user} AND set_id = ${setId}
      `;

    const changesResult = db.sql`SELECT changes() as affected_rows;`;
    const affectedRows = changesResult[0].affected_rows || 0;

    ctx.response.status = 200;
    if (affectedRows > 0) {
      ctx.response.body = { message: "Set successfully untracked" };
    } else {
      ctx.response.body = { message: "Set was not being tracked" };
    }
  });

  // get tracked status
  router.get("/:setId/tracked", async (ctx) => {
    const { setId } = ctx.params;
    const sessionToken = await ctx.cookies.get("SESSION");

    if (sessionToken == null) {
      ctx.response.body = {
        error: NO_SESSION_TOKEN,
      };
      ctx.response.status = 401;
      return;
    }

    const usernameResult = db.sql`
        SELECT s.username
        FROM Sessions s
        WHERE s.token = ${sessionToken}
          AND s.expires > strftime('%s', 'now');
      `;

    if (!usernameResult || usernameResult.length === 0) {
      ctx.response.body = { error: "Invalid session" };
      ctx.response.status = 401;
      return;
    }

    const user = usernameResult[0].username;

    const setInfo = db.sql`
        SELECT id
        FROM Sets
        WHERE id = ${setId};
      `;

    if (!setInfo || setInfo.length === 0) {
      ctx.response.body = { error: "Set not found" };
      ctx.response.status = 404;
      return;
    }

    const trackedResult = db.sql`
        SELECT 1
        FROM TrackedSets
        WHERE username = ${user} AND set_id = ${setId}
      `;

    ctx.response.body = {
      isTracked: trackedResult.length > 0,
    };
  });

  return router;
}

// get relevant cards for study
function getRelevantCards(
  db: Database,
  username: string,
  setId: string,
  pointsOffset: number,
) {
  const cards = db.sql`
    SELECT
      c.id,
      c.set_id,
      c.front,
      c.back,
      COALESCE(cp.points, 0) as points,
      cp.last_reviewed
    FROM Cards c
    LEFT JOIN CardProgress cp ON c.id = cp.card_id AND cp.username = ${username}
    WHERE c.set_id = ${setId};
  `;

  const relevantCards = [];
  const now = Math.floor(Date.now() / 1000);

  for (const card of cards) {
    let points = card.points;
    const lastReviewed = card.last_reviewed ? parseInt(card.last_reviewed) : 0;
    const daysSinceLastReview = (now - lastReviewed) / (24 * 60 * 60);

    if (daysSinceLastReview > Math.pow(2, points) * 2) {
      points = calculateAdjustedPoints(points, daysSinceLastReview);
    }

    points += pointsOffset;

    // add card if it's in reviewable state
    if (daysSinceLastReview > Math.pow(2, points)) {
      relevantCards.push({
        id: card.id,
        set_id: card.set_id,
        front: card.front,
        back: card.back,
      });
    }
  }

  return relevantCards;
}

// adjust for missed sessions
function calculateAdjustedPoints(
  originalPoints: number,
  daysSinceLastReview: number,
): number {
  // iterative approach to remove points

  let remainingDays = daysSinceLastReview - Math.pow(2, originalPoints); // Subtract the grace period
  let pointsToLose = 0;

  for (let pointLevel = originalPoints - 1; pointLevel >= 0; pointLevel--) {
    const intervalForThisPoint = Math.pow(2, pointLevel);
    if (remainingDays >= intervalForThisPoint) {
      pointsToLose++;
      remainingDays -= intervalForThisPoint;
    } else {
      // stop when reaching current day.
      break;
    }
  }

  return Math.max(0, originalPoints - pointsToLose);
}
