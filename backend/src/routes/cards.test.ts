import { testing } from "@oak/oak";
import { assertEquals } from "@std/assert";
import { initializeDB, memDB } from "../db.ts";
import { createAPIRouter } from "./combined.ts";
import { FORBIDDEN, INVALID_REQUEST, NO_SESSION_TOKEN } from "./constants.ts";
import type { CardsBasicView } from "../types/database.ts";

import {
  createBack,
  createCard,
  createCardProgress,
  createFront,
  createPreviousTime,
  createSession,
  createSet,
  createUser,
} from "../utils/testing.ts";

Deno.test({
  name: "Read Card",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const card = await createCard(db);

    const cardCtx = testing.createMockContext({
      path: `/api/cards/${card.id}`,
    });

    await mw(cardCtx, next);

    assertEquals(cardCtx.response.body, {
      back: card.back,
      front: card.front,
      id: card.id,
      set_id: card.set.id,
    });
  },
});

Deno.test({
  name: "Read Progress",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const card = await createCard(db);
    const session = await createSession(db, user);
    const cardProgress = await createCardProgress(db, user, card, 36, 12341234);

    const progressCtx = testing.createMockContext({
      path: `/api/cards/${card.id}/progress`,
      headers: [["Cookie", `SESSION=${session.token}`]],
    });

    const failCtx = testing.createMockContext({
      path: `/api/cards/${card.id}/progress`,
    });

    await mw(progressCtx, next);
    await mw(failCtx, next);

    assertEquals(progressCtx.response.body, {
      last_reviewed: cardProgress.studyTime,
      points: cardProgress.points,
    });
    assertEquals(progressCtx.response.status, 200);
    assertEquals(failCtx.response.body, { error: NO_SESSION_TOKEN });
    assertEquals(failCtx.response.status, 401);
  },
});

Deno.test({
  name: "Create Card - Success (Owner)",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const set = await createSet(db, user); // Create set with user as owner
    const session = await createSession(db, user);

    const front = createFront();
    const back = createBack();

    const createCtx = testing.createMockContext({
      path: "/api/cards/create",
      method: "POST",
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${session.token}`],
      ],
      body: ReadableStream.from([
        JSON.stringify({
          set_id: set.id,
          front,
          back,
        }),
      ]),
    });

    await mw(createCtx, next);

    assertEquals(createCtx.response.status, 200);
    const responseBody = createCtx.response.body as {
      id: string;
      set_id: string;
      front: string;
      back: string;
    };
    assertEquals(typeof responseBody.id, "string");
    assertEquals(responseBody.set_id, set.id);
    assertEquals(responseBody.front, front);
    assertEquals(responseBody.back, back);

    // Verify the card was actually created in the database
    const createdCards = db.sql<
      CardsBasicView
    >`SELECT id, set_id, front, back FROM Cards WHERE set_id = ${set.id}`;
    assertEquals(createdCards.length, 1);
    assertEquals(createdCards[0].front, front);
    assertEquals(createdCards[0].back, back);
  },
});

Deno.test({
  name: "Create Card - No Session",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const set = await createSet(db, user);

    const createCtx = testing.createMockContext({
      path: "/api/cards/create",
      method: "POST",
      headers: [
        ["Content-Type", "application/json"],
      ],
      body: ReadableStream.from([
        JSON.stringify({
          set_id: set.id,
          front: createFront(),
          back: createBack(),
        }),
      ]),
    });

    await mw(createCtx, next);

    assertEquals(createCtx.response.status, 401);
    assertEquals(createCtx.response.body, { error: NO_SESSION_TOKEN });

    // Verify no card was created in the database
    const createdCards = db.sql<
      CardsBasicView
    >`SELECT id, set_id, front, back FROM Cards WHERE set_id = ${set.id}`;
    assertEquals(createdCards.length, 0);
  },
});

Deno.test({
  name: "Create Card - Unauthorized Access",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const owner = await createUser(db, "owner");
    const unauthorizedUser = await createUser(db, "unauthorized");
    const set = await createSet(db, owner); // Create set with owner as owner
    const session = await createSession(db, unauthorizedUser);

    const createCtx = testing.createMockContext({
      path: "/api/cards/create",
      method: "POST",
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${session.token}`],
      ],
      body: ReadableStream.from([
        JSON.stringify({
          set_id: set.id,
          front: createFront(),
          back: createBack(),
        }),
      ]),
    });

    await mw(createCtx, next);

    assertEquals(createCtx.response.status, 403);
    assertEquals(createCtx.response.body, { error: FORBIDDEN });

    // Verify no card was created in the database
    const createdCards = db.sql<
      CardsBasicView
    >`SELECT id, set_id, front, back FROM Cards WHERE set_id = ${set.id}`;
    assertEquals(createdCards.length, 0);
  },
});

Deno.test({
  name: "Create Card - Invalid Request (Missing Fields)",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const set = await createSet(db, user);
    const session = await createSession(db, user);

    const createCtx = testing.createMockContext({
      path: "/api/cards/create",
      method: "POST",
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${session.token}`],
      ],
      body: ReadableStream.from([
        JSON.stringify({
          set_id: set.id,
          // Missing front and back
        }),
      ]),
    });

    await mw(createCtx, next);

    assertEquals(createCtx.response.status, 400);
    assertEquals(createCtx.response.body, { error: INVALID_REQUEST });

    // Verify no card was created in the database
    const createdCards = db.sql<
      CardsBasicView
    >`SELECT id, set_id, front, back FROM Cards WHERE set_id = ${set.id}`;
    assertEquals(createdCards.length, 0);
  },
});

Deno.test({
  name: "Create Card - Invalid Request (Empty Fields)",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const set = await createSet(db, user);
    const session = await createSession(db, user);

    const createCtx = testing.createMockContext({
      path: "/api/cards/create",
      method: "POST",
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${session.token}`],
      ],
      body: ReadableStream.from([
        JSON.stringify({
          set_id: set.id,
          front: "", // Empty front
          back: "", // Empty back
        }),
      ]),
    });

    await mw(createCtx, next);

    assertEquals(createCtx.response.status, 400);
    assertEquals(createCtx.response.body, { error: INVALID_REQUEST });

    // Verify no card was created in the database
    const createdCards = db.sql<
      CardsBasicView
    >`SELECT id, set_id, front, back FROM Cards WHERE set_id = ${set.id}`;
    assertEquals(createdCards.length, 0);
  },
});

Deno.test({
  name: "Create Card - Set Not Found",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const session = await createSession(db, user);

    const createCtx = testing.createMockContext({
      path: "/api/cards/create",
      method: "POST",
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${session.token}`],
      ],
      body: ReadableStream.from([
        JSON.stringify({
          set_id: "nonexistent_set_id",
          front: createFront(),
          back: createBack(),
        }),
      ]),
    });

    await mw(createCtx, next);

    assertEquals(createCtx.response.status, 404);
    assertEquals(createCtx.response.body, { error: "SET_NOT_FOUND" });

    // Verify no card was created in the database
    const createdCards = db
      .sql<
      CardsBasicView
    >`SELECT id, set_id, front, back FROM Cards WHERE set_id = ${"nonexistent_set_id"}`;
    assertEquals(createdCards.length, 0);
  },
});

Deno.test({
  name: "Study Card - Success with correct answer",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const card = await createCard(db);
    const session = await createSession(db, user);
    // Create initial progress with 2 points and past timestamp
    await createCardProgress(db, user, card, 2, 0); // 0 means epoch time, definitely old

    const studyCtx = testing.createMockContext({
      path: `/api/cards/${card.id}/study`,
      method: "POST",
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${session.token}`],
      ],
      body: ReadableStream.from([
        JSON.stringify({
          result: "correct",
        }),
      ]),
    });

    await mw(studyCtx, next);

    assertEquals(studyCtx.response.status, 200);
    const responseBody = studyCtx.response.body as {
      cardId: string;
      result: string;
      newPoints: number;
    };
    assertEquals(responseBody.cardId, card.id);
    assertEquals(responseBody.result, "correct");
    // The old points should be adjusted to 0 due to the time difference from epoch
    assertEquals(responseBody.newPoints, 1); // 0 (adjusted) + 1 for correct
  },
});

Deno.test({
  name: "Study Card - Success with incorrect answer",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const card = await createCard(db);
    const session = await createSession(db, user);
    // Create initial progress with 5 points and past timestamp
    await createCardProgress(
      db,
      user,
      card,
      5,
      createPreviousTime(60 * 60 * 24 * ((2 ** 5) + 1)),
    ); // 0 means epoch time, definitely old

    const studyCtx = testing.createMockContext({
      path: `/api/cards/${card.id}/study`,
      method: "POST",
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${session.token}`],
      ],
      body: ReadableStream.from([
        JSON.stringify({
          result: "incorrect",
        }),
      ]),
    });

    await mw(studyCtx, next);

    assertEquals(studyCtx.response.status, 200);
    const responseBody = studyCtx.response.body as {
      cardId: string;
      result: string;
      newPoints: number;
    };
    assertEquals(responseBody.cardId, card.id);
    assertEquals(responseBody.result, "incorrect");
    assertEquals(responseBody.newPoints, 4);
  },
});

Deno.test({
  name: "Study Card - Invalid result parameter",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const card = await createCard(db);
    const session = await createSession(db, user);

    const studyCtx = testing.createMockContext({
      path: `/api/cards/${card.id}/study`,
      method: "POST",
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${session.token}`],
      ],
      body: ReadableStream.from([
        JSON.stringify({
          result: "invalid",
        }),
      ]),
    });

    await mw(studyCtx, next);

    assertEquals(studyCtx.response.status, 400);
    // Should return INVALID_REQUEST error
  },
});

Deno.test({
  name: "Study Card - Card not found",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const session = await createSession(db, user);

    const studyCtx = testing.createMockContext({
      path: `/api/cards/nonexistentcard/study`,
      method: "POST",
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${session.token}`],
      ],
      body: ReadableStream.from([
        JSON.stringify({
          result: "correct",
        }),
      ]),
    });

    await mw(studyCtx, next);

    assertEquals(studyCtx.response.status, 404);
    assertEquals(studyCtx.response.body, { error: "CARD_NOT_FOUND" });
  },
});

Deno.test({
  name: "Study Card - No session",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const card = await createCard(db);

    const studyCtx = testing.createMockContext({
      path: `/api/cards/${card.id}/study`,
      method: "POST",
      headers: [
        ["Content-Type", "application/json"],
      ],
      body: ReadableStream.from([
        JSON.stringify({
          result: "correct",
        }),
      ]),
    });

    await mw(studyCtx, next);

    assertEquals(studyCtx.response.status, 401);
    assertEquals(studyCtx.response.body, { error: "NO_SESSION_TOKEN" });
  },
});

Deno.test({
  name: "Update Card - Success (Owner)",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const set = await createSet(db, user);
    const card = await createCard(db, set);
    const session = await createSession(db, user);

    const updatedFront = createFront();
    const updatedBack = createBack();

    const updateCtx = testing.createMockContext({
      path: `/api/cards/${card.id}`,
      method: "PATCH",
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${session.token}`],
      ],
      body: ReadableStream.from([
        JSON.stringify({
          front: updatedFront,
          back: updatedBack,
        }),
      ]),
    });

    await mw(updateCtx, next);

    assertEquals(updateCtx.response.status, 200);
    const responseBody = updateCtx.response.body as {
      id: string;
      set_id: string;
      front: string;
      back: string;
    };
    assertEquals(responseBody.id, card.id);
    assertEquals(responseBody.set_id, card.set.id);
    assertEquals(responseBody.front, updatedFront);
    assertEquals(responseBody.back, updatedBack);

    // Verify the card was updated in the database
    const updatedCards = db.sql<
      CardsBasicView
    >`SELECT id, set_id, front, back FROM Cards WHERE id = ${card.id}`;
    assertEquals(updatedCards.length, 1);
    assertEquals(updatedCards[0].front, updatedFront);
    assertEquals(updatedCards[0].back, updatedBack);
  },
});

Deno.test({
  name: "Update Card - Partial Update (Front Only)",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const set = await createSet(db, user);
    const card = await createCard(db, set);
    const session = await createSession(db, user);

    const updatedFront = createFront();

    const updateCtx = testing.createMockContext({
      path: `/api/cards/${card.id}`,
      method: "PATCH",
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${session.token}`],
      ],
      body: ReadableStream.from([
        JSON.stringify({
          front: updatedFront,
        }),
      ]),
    });

    await mw(updateCtx, next);

    assertEquals(updateCtx.response.status, 200);
    const responseBody = updateCtx.response.body as {
      id: string;
      set_id: string;
      front: string;
      back: string;
    };
    assertEquals(responseBody.id, card.id);
    assertEquals(responseBody.set_id, card.set.id);
    assertEquals(responseBody.front, updatedFront);
    assertEquals(responseBody.back, card.back); // Back should remain unchanged

    // Verify the card was updated in the database
    const updatedCards = db.sql<
      CardsBasicView
    >`SELECT id, set_id, front, back FROM Cards WHERE id = ${card.id}`;
    assertEquals(updatedCards.length, 1);
    assertEquals(updatedCards[0].front, updatedFront);
    assertEquals(updatedCards[0].back, card.back);
  },
});

Deno.test({
  name: "Update Card - Partial Update (Back Only)",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const set = await createSet(db, user);
    const card = await createCard(db, set);
    const session = await createSession(db, user);

    const updatedBack = createBack();

    const updateCtx = testing.createMockContext({
      path: `/api/cards/${card.id}`,
      method: "PATCH",
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${session.token}`],
      ],
      body: ReadableStream.from([
        JSON.stringify({
          back: updatedBack,
        }),
      ]),
    });

    await mw(updateCtx, next);

    assertEquals(updateCtx.response.status, 200);
    const responseBody = updateCtx.response.body as {
      id: string;
      set_id: string;
      front: string;
      back: string;
    };
    assertEquals(responseBody.id, card.id);
    assertEquals(responseBody.set_id, card.set.id);
    assertEquals(responseBody.front, card.front); // Front should remain unchanged
    assertEquals(responseBody.back, updatedBack);

    // Verify the card was updated in the database
    const updatedCards = db.sql<
      CardsBasicView
    >`SELECT id, set_id, front, back FROM Cards WHERE id = ${card.id}`;
    assertEquals(updatedCards.length, 1);
    assertEquals(updatedCards[0].front, card.front);
    assertEquals(updatedCards[0].back, updatedBack);
  },
});

Deno.test({
  name: "Update Card - No Session",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const set = await createSet(db, user);
    const card = await createCard(db, set);

    const updateCtx = testing.createMockContext({
      path: `/api/cards/${card.id}`,
      method: "PATCH",
      headers: [
        ["Content-Type", "application/json"],
      ],
      body: ReadableStream.from([
        JSON.stringify({
          front: createFront(),
          back: createBack(),
        }),
      ]),
    });

    await mw(updateCtx, next);

    assertEquals(updateCtx.response.status, 401);
    assertEquals(updateCtx.response.body, { error: NO_SESSION_TOKEN });

    // Verify the card was not updated in the database
    const originalCards = db.sql<
      CardsBasicView
    >`SELECT id, set_id, front, back FROM Cards WHERE id = ${card.id}`;
    assertEquals(originalCards.length, 1);
    assertEquals(originalCards[0].front, card.front);
    assertEquals(originalCards[0].back, card.back);
  },
});

Deno.test({
  name: "Update Card - Unauthorized Access",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const owner = await createUser(db, "owner");
    const set = await createSet(db, owner); // Create set with owner as owner
    const card = await createCard(db, set); // Create card in owner's set
    const unauthorizedUser = await createUser(db, "unauthorized");
    const session = await createSession(db, unauthorizedUser);

    const updateCtx = testing.createMockContext({
      path: `/api/cards/${card.id}`,
      method: "PATCH",
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${session.token}`],
      ],
      body: ReadableStream.from([
        JSON.stringify({
          front: createFront(),
          back: createBack(),
        }),
      ]),
    });

    await mw(updateCtx, next);

    assertEquals(updateCtx.response.status, 403);
    assertEquals(updateCtx.response.body, { error: FORBIDDEN });

    // Verify the card was not updated in the database
    const originalCards = db.sql<
      CardsBasicView
    >`SELECT id, set_id, front, back FROM Cards WHERE id = ${card.id}`;
    assertEquals(originalCards.length, 1);
    assertEquals(originalCards[0].front, card.front);
    assertEquals(originalCards[0].back, card.back);
  },
});

Deno.test({
  name: "Update Card - Invalid Request (Non-string fields)",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const set = await createSet(db, user);
    const card = await createCard(db, set);
    const session = await createSession(db, user);

    const updateCtx = testing.createMockContext({
      path: `/api/cards/${card.id}`,
      method: "PATCH",
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${session.token}`],
      ],
      body: ReadableStream.from([
        JSON.stringify({
          front: 123, // Invalid - should be string
          back: createBack(),
        }),
      ]),
    });

    await mw(updateCtx, next);

    assertEquals(updateCtx.response.status, 400);
    assertEquals(updateCtx.response.body, {
      error: INVALID_REQUEST,
      message: "Front and back must be strings if provided",
    });

    // Verify the card was not updated in the database
    const originalCards = db.sql<
      CardsBasicView
    >`SELECT id, set_id, front, back FROM Cards WHERE id = ${card.id}`;
    assertEquals(originalCards.length, 1);
    assertEquals(originalCards[0].front, card.front);
    assertEquals(originalCards[0].back, card.back);
  },
});

Deno.test({
  name: "Update Card - Invalid Request (No fields to update)",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const set = await createSet(db, user);
    const card = await createCard(db, set);
    const session = await createSession(db, user);

    const updateCtx = testing.createMockContext({
      path: `/api/cards/${card.id}`,
      method: "PATCH",
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${session.token}`],
      ],
      body: ReadableStream.from([
        JSON.stringify({}),
      ]),
    });

    await mw(updateCtx, next);

    assertEquals(updateCtx.response.status, 400);
    assertEquals(updateCtx.response.body, {
      error: INVALID_REQUEST,
      message: "At least one field (front or back) must be provided to update",
    });

    // Verify the card was not updated in the database
    const originalCards = db.sql<
      CardsBasicView
    >`SELECT id, set_id, front, back FROM Cards WHERE id = ${card.id}`;
    assertEquals(originalCards.length, 1);
    assertEquals(originalCards[0].front, card.front);
    assertEquals(originalCards[0].back, card.back);
  },
});

Deno.test({
  name: "Update Card - Card Not Found",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const session = await createSession(db, user);

    const updateCtx = testing.createMockContext({
      path: `/api/cards/nonexistent_card_id`,
      method: "PATCH",
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${session.token}`],
      ],
      body: ReadableStream.from([
        JSON.stringify({
          front: createFront(),
          back: createBack(),
        }),
      ]),
    });

    await mw(updateCtx, next);

    assertEquals(updateCtx.response.status, 404);
    assertEquals(updateCtx.response.body, { error: "CARD_NOT_FOUND" });
  },
});

Deno.test({
  name: "Delete Card - Success (Owner)",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const set = await createSet(db, user);
    const card = await createCard(db, set);
    const session = await createSession(db, user);

    // Verify card exists before deletion
    const cardsBefore = db.sql<
      CardsBasicView
    >`SELECT id FROM Cards WHERE id = ${card.id}`;
    assertEquals(cardsBefore.length, 1);

    const deleteCtx = testing.createMockContext({
      path: `/api/cards/${card.id}`,
      method: "DELETE",
      headers: [
        ["Cookie", `SESSION=${session.token}`],
      ],
    });

    await mw(deleteCtx, next);

    assertEquals(deleteCtx.response.status, 200);
    assertEquals(deleteCtx.response.body, {
      id: card.id,
      message: "Card deleted successfully",
    });

    // Verify the card was deleted from the database
    const cardsAfter = db.sql<
      CardsBasicView
    >`SELECT id FROM Cards WHERE id = ${card.id}`;
    assertEquals(cardsAfter.length, 0);
  },
});

Deno.test({
  name: "Delete Card - No Session",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const set = await createSet(db, user);
    const card = await createCard(db, set);

    const deleteCtx = testing.createMockContext({
      path: `/api/cards/${card.id}`,
      method: "DELETE",
    });

    await mw(deleteCtx, next);

    assertEquals(deleteCtx.response.status, 401);
    assertEquals(deleteCtx.response.body, { error: NO_SESSION_TOKEN });

    // Verify the card was not deleted from the database
    const cardsAfter = db.sql<
      CardsBasicView
    >`SELECT id FROM Cards WHERE id = ${card.id}`;
    assertEquals(cardsAfter.length, 1);
  },
});

Deno.test({
  name: "Delete Card - Unauthorized Access",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const owner = await createUser(db, "owner");
    const set = await createSet(db, owner); // Create set with owner as owner
    const card = await createCard(db, set); // Create card in owner's set
    const unauthorizedUser = await createUser(db, "unauthorized");
    const session = await createSession(db, unauthorizedUser);

    const deleteCtx = testing.createMockContext({
      path: `/api/cards/${card.id}`,
      method: "DELETE",
      headers: [
        ["Cookie", `SESSION=${session.token}`],
      ],
    });

    await mw(deleteCtx, next);

    assertEquals(deleteCtx.response.status, 403);
    assertEquals(deleteCtx.response.body, { error: FORBIDDEN });

    // Verify the card was not deleted from the database
    const cardsAfter = db.sql<
      CardsBasicView
    >`SELECT id FROM Cards WHERE id = ${card.id}`;
    assertEquals(cardsAfter.length, 1);
  },
});

Deno.test({
  name: "Delete Card - Card Not Found",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const session = await createSession(db, user);

    const deleteCtx = testing.createMockContext({
      path: `/api/cards/nonexistent_card_id`,
      method: "DELETE",
      headers: [
        ["Cookie", `SESSION=${session.token}`],
      ],
    });

    await mw(deleteCtx, next);

    assertEquals(deleteCtx.response.status, 404);
    assertEquals(deleteCtx.response.body, { error: "CARD_NOT_FOUND" });
  },
});
