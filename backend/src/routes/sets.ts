//TODO: Use Date.now() instead of strftime so expirations actually work.
import { Router } from "@oak/oak";
import {
  FORBIDDEN,
  INVALID_REQUEST,
  SET_TRACKED,
  SET_UNTRACKED,
} from "./constants.ts";

import { Snowflake } from "../utils/snowflake.ts";
import type { Database } from "@db/sqlite";
import { calculateAdjustedPoints } from "../utils/points.ts";
import { getSession } from "../utils/sessionkey.ts";
import type {
  CardProgressWithCardInfoResult,
  CardsBasicView,
  ChangesResult,
  RankedSetsResult,
  RankedSetsWithCardsResult,
  SetsBasicView,
  TrackedStatusResult,
} from "../types/database.ts";

export type SetDataResult = {
  id: string;
  owner: string;
  title: string;
  cards: CardsBasicView[];
};

export type SearchResult = {
  id: string;
  title: string;
  owner: string;
  rank: number;
  card: {
    front: string;
    back: string;
  } | null;
};

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
    const username = await getSession(ctx, db);
    if (!username) return;

    const { title } = await ctx.request.body.json();

    if (typeof title !== "string" || title.length === 0 || title.length > 50) {
      ctx.response.body = {
        error: INVALID_REQUEST,
      };
      ctx.response.status = 400;
      return;
    }

    const snowflake = Snowflake.generate();

    db.sql`
      INSERT INTO Sets (id, rowid_int, owner, title)
      VALUES (${snowflake}, ${BigInt("0x" + snowflake)}, ${username}, ${title});
    `;

    ctx.response.body = {
      id: snowflake,
      owner: username,
      title: title,
    };
    ctx.response.status = 200;
  });

  // get all tracked sets for user with study option as a single combined set
  router.get("/tracked", async (ctx) => {
    const studyParam = ctx.request.url.searchParams.get("study");
    const study = studyParam !== null ? studyParam : null;

    const user = await getSession(ctx, db);
    if (!user) return;

    const trackedSets = db.sql<SetsBasicView>`
      SELECT s.id, s.owner, s.title
      FROM Sets s
      INNER JOIN TrackedSets ts ON s.id = ts.set_id
      WHERE ts.username = ${user};
    `;

    // Create a combined pseudo-set to hold all cards
    const combinedSet = {
      id: "tracked",
      owner: user,
      title: "Tracked Sets",
      cards: [] as CardsBasicView[],
    } satisfies SetDataResult;

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
        const cards = db.sql<CardsBasicView>`
          SELECT c.id, c.set_id, c.front, c.back
          FROM Cards c
          WHERE c.set_id = ${set.id};
        `;
        combinedSet.cards.push(...cards);
      }
    }

    ctx.response.body = combinedSet;
  });

  // Get list of tracked set IDs for authenticated user
  router.get("/tracked/list", async (ctx) => {
    const user = await getSession(ctx, db);
    if (!user) return;

    const trackedSets = db.sql<SetsBasicView>`
      SELECT s.id, s.owner, s.title
      FROM Sets s
      INNER JOIN TrackedSets ts ON s.id = ts.set_id
      WHERE ts.username = ${user};
    `;

    ctx.response.body = trackedSets;
  });

  // get sets owned by a specific user (public endpoint)
  router.get("/owned/:username", (ctx) => {
    const { username } = ctx.params;

    const data = db.sql<
      SetsBasicView
    >`
      SELECT id, title, owner
      FROM Sets
      WHERE owner = ${username};
    `;

    ctx.response.body = data;
  });

  // text search for sets by title and content
  router.get("/search", (ctx) => {
    const search = ctx.request.url.searchParams;
    const q = search.get("q");

    if (!q) {
      ctx.response.body = { error: "QUERY_PARAMETER_MISSING" };
      ctx.response.status = 400;
      return;
    }

    const titleMatches = db.sql<RankedSetsResult>`
      SELECT
        s.id,
        s.title,
        s.owner,
        BM25(SetsFTS) as rank
      FROM SetsFTS
      JOIN Sets s ON s.rowid_int = SetsFTS.rowid
      WHERE SetsFTS MATCH ${q}
      ORDER BY BM25(SetsFTS)
      LIMIT 20
    `;

    const cardMatches = db.sql<RankedSetsWithCardsResult>`
      SELECT DISTINCT
        s.id,
        s.title,
        s.owner,
        BM25(CardsFTS) as rank,
        c.id AS card_id,
        c.front AS card_front,
        c.back AS card_back
      FROM CardsFTS
      JOIN Cards c ON c.rowid_int = CardsFTS.rowid
      JOIN Sets s ON s.id = c.set_id
      WHERE CardsFTS MATCH ${q}
      ORDER BY BM25(CardsFTS)
      LIMIT 20
    `;

    type Accumulator = {
      map: Map<string, SearchResult>;
    };

    const acc: Accumulator = {
      map: new Map(),
    };

    for (const r of [...titleMatches, ...cardMatches]) {
      const row = r as (RankedSetsResult | RankedSetsWithCardsResult);
      const current = acc.map.get(row.id);

      const candidate: SearchResult = "card_id" in row
        ? {
          id: row.id,
          title: row.title,
          owner: row.owner,
          rank: row.rank,
          card: {
            front: row.card_front,
            back: row.card_back,
          },
        }
        : {
          id: row.id,
          title: row.title,
          owner: row.owner,
          rank: row.rank * 2,
          card: null,
        };

      if (!current) {
        // insert if new
        acc.map.set(row.id, candidate);
      } else {
        // choose better result
        if (candidate.rank < current.rank) {
          acc.map.set(row.id, candidate);
        } else if (
          current.rank <= candidate.rank && // current is at least as good
          current.card === null && // current lacks card data (likely title)
          candidate.card !== null // candidate has card data (is card match)
        ) {
          // copy card match into better title match
          current.card = candidate.card;
        }
      }
    }

    const allMatches: SearchResult[] = Array.from(acc.map.values())
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 20);

    ctx.response.body = allMatches;
  });

  // get set from id with study option
  router.get("/:setId", async (ctx) => {
    const { setId } = ctx.params;
    const studyParam = ctx.request.url.searchParams.get("study");
    const study = studyParam !== null ? studyParam : null;

    const setInfo = db.sql<SetsBasicView>`
      SELECT s.id, s.owner, s.title
      FROM Sets s
      WHERE s.id = ${setId};
    `;

    if (!setInfo || setInfo.length === 0) {
      ctx.response.body = { error: "Set not found" };
      ctx.response.status = 404;
      return;
    }

    const response: SetsBasicView & { cards: CardsBasicView[] } = {
      id: setInfo[0].id,
      owner: setInfo[0].owner,
      title: setInfo[0].title,
      cards: [],
    };

    let cards: CardsBasicView[] = [];

    if (study !== null) {
      const user = await getSession(ctx, db);
      if (!user) return;

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
      cards = db.sql<CardsBasicView>`
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
    const user = await getSession(ctx, db);
    if (!user) return;

    const setInfo = db.sql<SetsBasicView>`
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
      ctx.response.body = {
        message: SET_TRACKED,
      };
    } catch (error: unknown) {
      // double-track is fine
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed")
      ) {
        ctx.response.status = 200;
        ctx.response.body = { message: SET_TRACKED };
      } else {
        ctx.response.status = 500;
        ctx.response.body = { error: "Failed to track set" };
      }
    }
  });

  // untrack set
  router.delete("/:setId/untrack", async (ctx) => {
    const { setId } = ctx.params;
    const user = await getSession(ctx, db);
    if (!user) return;

    const setInfo = db.sql<SetsBasicView>`
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

    const changesResult = db.sql<
      ChangesResult
    >`
      SELECT changes() as affected_rows;
    `;
    const affectedRows = changesResult[0].affected_rows || 0;

    ctx.response.status = 200;
    if (affectedRows > 0) {
      ctx.response.body = {
        message: SET_UNTRACKED,
      };
    } else {
      ctx.response.body = {
        message: SET_UNTRACKED,
      };
    }
  });

  // get tracked status
  router.get("/:setId/tracked", async (ctx) => {
    const { setId } = ctx.params;
    const user = await getSession(ctx, db);
    if (!user) return;

    const setInfo = db.sql<SetsBasicView>`
      SELECT id
      FROM Sets
      WHERE id = ${setId};
    `;

    if (!setInfo || setInfo.length === 0) {
      ctx.response.body = { error: "Set not found" };
      ctx.response.status = 404;
      return;
    }

    const trackedResult = db.sql<TrackedStatusResult>`
      SELECT 1
      FROM TrackedSets
      WHERE username = ${user} AND set_id = ${setId}
    `;

    ctx.response.body = {
      isTracked: trackedResult.length > 0 ? SET_TRACKED : SET_UNTRACKED,
    };
  });

  router.delete("/:setId", async (ctx) => {
    const { setId } = ctx.params;

    const username = await getSession(ctx, db);
    if (!username) return;

    // Validate setId is a snowflake.
    if (!Snowflake.isSnowflake(setId!)) {
      ctx.response.body = {
        error: "INVALID_SET_ID",
      };
      ctx.response.status = 400;
      return;
    }

    const set = db.sql<SetsBasicView>`
      SELECT id, owner, title
      FROM Sets
      WHERE id = ${setId}
      AND owner = ${username};
    `;

    // Validate that the set exists & is owned.
    if (set.length === 0) {
      if (
        db.sql<
          SetsBasicView
        >`SELECT id, owner, title FROM Sets WHERE id = ${setId};`.length > 0
      ) {
        ctx.response.body = {
          error: FORBIDDEN,
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

    db.sql`
      DELETE FROM Sets
      WHERE id = ${setId};
    `;

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

    const username = await getSession(ctx, db);
    if (!username) return;

    // Validate setId is a snowflake.
    if (!Snowflake.isSnowflake(setId!)) {
      ctx.response.body = {
        error: "INVALID_SET_ID",
      };
      ctx.response.status = 400;
      return;
    }

    const set = db.sql<SetsBasicView>`
      SELECT id, owner, title
      FROM Sets
      WHERE id = ${setId}
      AND Owner = ${username};
    `;

    // Validate that the set exists.
    if (set.length === 0) {
      if (
        db.sql<
          SetsBasicView
        >`SELECT id, owner, title FROM Sets WHERE id = ${setId};`.length > 0
      ) {
        ctx.response.body = {
          error: FORBIDDEN,
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

    const { title } = await ctx.request.body.json();

    // Validate title is valid title.
    if (
      typeof title !== "string" || title.length === 0 ||
      title.length > 50
    ) {
      ctx.response.body = {
        error: INVALID_REQUEST,
      };
      ctx.response.status = 400;
      return;
    }

    db.sql`
      UPDATE Sets
      SET title = ${title}
      WHERE id = ${setId};
    `;

    ctx.response.body = {
      id: setId,
      title: title,
    };
    ctx.response.status = 200;
    return;
  });

  return router;
}

// get relevant cards for study
function getRelevantCards(
  db: Database,
  username: string,
  setId: string,
  pointsOffset: number,
): { id: string; set_id: string; front: string; back: string }[] {
  const cards = db.sql<CardProgressWithCardInfoResult>`
    SELECT
      c.id,
      c.set_id,
      c.front,
      c.back,
      COALESCE(cp.points, 0) as points,
      COALESCE(cp.last_reviewed, 0) as last_reviewed
    FROM Cards c
    LEFT JOIN CardProgress cp ON c.id = cp.card_id AND cp.username = ${username}
    WHERE c.set_id = ${setId};
  `;

  const relevantCards: {
    id: string;
    set_id: string;
    front: string;
    back: string;
  }[] = [];
  const now = Math.floor(Date.now() / 1000);

  for (const card of cards) {
    let points = card.points;
    const lastReviewed = card.last_reviewed;
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
