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
import { calculateAdjustedPoints } from "../utils/points.ts";

// Define types for database query results
export type SessionResult = { username: string };
export type SetResult = { id: string; owner: string; title: string };
export type UserResult = { username: string };
export type TrackedSetResult = { id: string; owner: string; title: string };
export type CardResult = {
  id: string;
  set_id: string;
  front: string;
  back: string;
};
export type CardProgressResult = {
  id: string;
  set_id: string;
  front: string;
  back: string;
  points: number;
  last_reviewed: string | null;
};
export type SetInfoResult = { id: string; owner: string; title: string };
export type TrackedStatusResult = { 1: number }; // SQLite returns 1 for SELECT 1
export type ChangesResult = { affected_rows: number };

// Define response types for endpoints
export type CreateSetResponse = {
  id: string;
  owner: string;
  title: string;
};

export type DeleteSetResponse = {
  id: string;
};

export type UpdateSetResponse = {
  id: string;
  owner: string;
  title: string;
};

export type TrackedSetResponse = {
  id: string; // "tracked"
  owner: string;
  title: string; // "Tracked Sets"
  cards: {
    id: string;
    set_id: string;
    front: string;
    back: string;
  }[];
};

export type TrackedListResponse = {
  id: string;
  owner: string;
  title: string;
}[];

export type OwnedSetsResponse = {
  id: string;
  title: string;
}[];

export type SetDetailsResponse = {
  id: string;
  owner: string;
  title: string;
  cards?: {
    id: string;
    set_id: string;
    front: string;
    back: string;
  }[];
};

export type TrackResponse = {
  message: string;
};

export type UntrackResponse = {
  message: string;
};

export type TrackedStatusResponse = {
  isTracked: boolean;
};

export type CardData = {
  front: string | null;
  back: string | null;
};

export type BaseMatch = {
  id: string;
  title: string;
  owner: string;
  rank: number;
};

export type TitleMatch = BaseMatch;

export type CardMatch = BaseMatch & {
  card_id: string;
  card_front: string;
  card_back: string;
};

export type SearchResult = BaseMatch & {
  card: CardData | null;
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
    const SESSION = await ctx.cookies.get("SESSION");

    if (SESSION == null) {
      ctx.response.body = {
        error: NO_SESSION_TOKEN,
      };
      ctx.response.status = 403;
      return;
    }

    const USERNAME = db.sql`
      SELECT username FROM Sessions
      WHERE token = ${SESSION}
      AND expires > strftime('%s', 'now');
    `[0]?.username;

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

    db.sql`
      INSERT INTO Sets (id, owner, title)
      VALUES (${SNOWFLAKE}, ${USERNAME}, ${title});
    `;

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

    const USERNAME = db.sql`
      SELECT username FROM Sessions
      WHERE token = ${SESSION}
      AND expires > strftime('%s', 'now');
    `[0]?.username;

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

    const SET = db.sql`
      SELECT * FROM Sets
      WHERE id = ${setId}
      AND owner = ${USERNAME};
    `;

    // Validate that the set exists & is owned.
    if (SET.length === 0) {
      if (db.sql`SELECT * FROM Sets WHERE id = ${setId};`.length > 0) {
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

    const SESSION = await ctx.cookies.get("SESSION");

    // Session authorization.
    if (SESSION == null) {
      ctx.response.body = {
        error: NO_SESSION_TOKEN,
      };
      ctx.response.status = 403;
      return;
    }

    const USERNAME = db.sql`
      SELECT username FROM Sessions
      WHERE token = ${SESSION}
      AND expires > strftime('%s', 'now');
    `[0]?.username;

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

    const SET = db.sql`
      SELECT * FROM Sets
      WHERE id = ${setId}
      AND Owner = ${USERNAME};
    `;

    // Validate that the set exists.
    if (SET.length === 0) {
      if (db.sql`SELECT * FROM Sets WHERE id = ${setId};`.length > 0) {
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
      db.sql`
        SELECT * FROM Users WHERE username = ${newOwner};
      `[0] == undefined
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

    db.sql`
      UPDATE Sets
      SET owner = ${newOwner}, title = ${newTitle}
      WHERE id = ${setId};
    `;

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

    const username = db.sql<SessionResult>`
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

    const trackedSets = db.sql<TrackedSetResult>`
        SELECT s.id, s.owner, s.title
        FROM Sets s
        INNER JOIN TrackedSets ts ON s.id = ts.set_id
        WHERE ts.username = ${user};
      `;

    // Create a combined pseudo-set to hold all cards
    const combinedSet: TrackedSetResponse = {
      id: "tracked",
      owner: user,
      title: "Tracked Sets",
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
        }[] = db.sql<CardResult>`
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
    const sessionToken = await ctx.cookies.get("SESSION");
    if (sessionToken == null) {
      ctx.response.body = {
        error: NO_SESSION_TOKEN,
      };
      ctx.response.status = 401;
      return;
    }

    const usernameResult = db.sql<SessionResult>`
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

    const trackedSets = db.sql<TrackedSetResult>`
      SELECT s.id, s.owner, s.title
      FROM Sets s
      INNER JOIN TrackedSets ts ON s.id = ts.set_id
      WHERE ts.username = ${user};
    `;

    ctx.response.body = trackedSets satisfies TrackedListResponse;
  });

  // get sets owned by a specific user (public endpoint)
  router.get("/owned/:username", (ctx) => {
    const { username } = ctx.params;

    const data: { id: string; title: string }[] = db.sql<
      { id: string; title: string }
    >`
      SELECT id, title
      FROM Sets
      WHERE owner = ${username};
    `;

    ctx.response.body = data satisfies OwnedSetsResponse;
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

    const titleMatches: TitleMatch[] = db.sql<TitleMatch>`
      SELECT
        s.id,
        s.title,
        s.owner,
        BM25(SetsFTS) as rank
      FROM SetsFTS
      JOIN Sets s ON s.id = SetsFTS.rowid
      WHERE SetsFTS MATCH ${q}
      ORDER BY BM25(SetsFTS)
      LIMIT 20
    `;

    const cardMatches: CardMatch[] = db.sql<CardMatch>`
      SELECT DISTINCT
        s.id,
        s.title,
        s.owner,
        BM25(CardsFTS) as rank,
        c.id AS card_id,
        c.front AS card_front,
        c.back AS card_back
      FROM CardsFTS
      JOIN Cards c ON c.id = CardsFTS.rowid
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
      const row = r as (CardMatch | TitleMatch);
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

    const setInfo = db.sql<SetInfoResult>`
      SELECT s.id, s.owner, s.title
      FROM Sets s
      WHERE s.id = ${setId};
    `;

    if (!setInfo || setInfo.length === 0) {
      ctx.response.body = { error: "Set not found" };
      ctx.response.status = 404;
      return;
    }

    const response: SetDetailsResponse = {
      id: setInfo[0].id,
      owner: setInfo[0].owner,
      title: setInfo[0].title,
    };

    let cards: { id: string; set_id: string; front: string; back: string }[] =
      [];

    if (study !== null) {
      // only send cards that need studying
      const username = db.sql<SessionResult>`
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
      cards = db.sql<CardResult>`
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

    const usernameResult = db.sql<SessionResult>`
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

    const setInfo = db.sql<SetInfoResult>`
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
        message: "Set successfully tracked",
      } satisfies TrackResponse;
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

    const usernameResult = db.sql<{ username: string }>`
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

    const setInfo = db.sql<SetInfoResult>`
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
        message: "Set successfully untracked",
      } satisfies UntrackResponse;
    } else {
      ctx.response.body = {
        message: "Set was not being tracked",
      } satisfies UntrackResponse;
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

    const usernameResult = db.sql<SessionResult>`
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

    const setInfo = db.sql<SetInfoResult>`
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
      isTracked: trackedResult.length > 0,
    } satisfies TrackedStatusResponse;
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
  const cards = db.sql<CardProgressResult>`
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

  const relevantCards: {
    id: string;
    set_id: string;
    front: string;
    back: string;
  }[] = [];
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
