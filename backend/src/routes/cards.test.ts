import { testing } from "@oak/oak";
import { assertEquals } from "@std/assert";
import { initializeDB, memDB } from "../db.ts";
import { createAPIRouter } from "./combined.ts";
import { NO_SESSION_TOKEN } from "./constants.ts";
import {
  createCard,
  createCardProgress,
  createSession,
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

    assertEquals(cardCtx.response.body, [
      {
        back: card.back,
        front: card.front,
        id: card.id,
        set_id: card.set.id,
      },
    ]);
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

    assertEquals(progressCtx.response.body, [
      {
        last_reviewed: cardProgress.studyTime,
        points: cardProgress.points,
      },
    ]);
    assertEquals(progressCtx.response.status, 200);
    assertEquals(failCtx.response.body, { error: NO_SESSION_TOKEN });
    assertEquals(failCtx.response.status, 401);
  },
});
