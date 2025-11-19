import { testing } from "@oak/oak";
import { assertEquals } from "@std/assert";
import { initializeDB, memDB } from "../db.ts";
import { createAPIRouter } from "./combined.ts";
import { NO_SESSION_TOKEN } from "./constants.ts";
import { createCard } from "../utils/testing.ts";

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

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${"testuser"}, ${"testemail@service.webemail"}, ${"c297e57206c7aee60fe2ede4bee13021542d0d472fa690c76557cdccf8610cc6cc63ff0d6f6a2f6433c577c5326d3023aabdedd04e453b43bfe1fd1ccc9cb728"}, ${"salt"})`;
    db.sql`INSERT INTO Sets (id, rowid_int, owner, title) VALUES (${"1111111111111111"}, ${
      BigInt("0x" + "1111111111111111")
    }, ${"testuser"}, ${"Test Set"})`;
    db.sql`INSERT INTO Cards (id, rowid_int, set_id, front, back) VALUES (${"1234123412341234"}, ${
      BigInt("0x" + "1234123412341234")
    }, ${"1111111111111111"}, ${"Front"}, ${"Back"})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${"testuser"}, ${"token"}, ${
      Date.now() + 60 * 60 * 24
    })`;
    db.sql`INSERT INTO CardProgress (username, card_id, points, last_reviewed) VALUES (${"testuser"}, ${"1234123412341234"}, ${36}, ${12341234})`;

    const progressCtx = testing.createMockContext({
      path: "/api/cards/1234123412341234/progress",
      headers: [["Cookie", `SESSION=token`]],
    });

    const failCtx = testing.createMockContext({
      path: "/api/cards/1234123412341234/progress",
    });

    await mw(progressCtx, next);
    await mw(failCtx, next);

    assertEquals(progressCtx.response.body, [
      {
        last_reviewed: 12341234,
        points: 36,
      },
    ]);
    assertEquals(progressCtx.response.status, 200);
    assertEquals(failCtx.response.body, { error: NO_SESSION_TOKEN });
    assertEquals(failCtx.response.status, 401);
  },
});
