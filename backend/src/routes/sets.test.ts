import { testing } from "@oak/oak";
import { assertEquals, assertNotEquals } from "@std/assert";
import { initializeDB, memDB } from "../db.ts";
import { createAPIRouter } from "./combined.ts";
import { NO_SESSION_TOKEN } from "./constants.ts";
import { SearchResult, TrackedListResponse } from "./sets.ts";
import {
  createCard,
  createCardProgress,
  createPreviousTime,
  createSession,
  createSet,
  createSetName,
  createSmallUniqueLabeled,
  createTracking,
  createUser,
} from "../utils/testing.ts";

Deno.test({
  name: "Create Set - Success",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const session = await createSession(db, user);

    const testSet = { title: "testtitle" };

    const ctx = testing.createMockContext({
      path: "/api/sets/create",
      method: "POST",
      headers: [["Cookie", `SESSION=${session.token}`]],
      body: ReadableStream.from([JSON.stringify(testSet)]),
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 200);
    const set = db.sql<{ title: string; owner: string }>`
      SELECT * from Sets
      WHERE title = ${testSet.title}
    `;
    assertEquals(set.length, 1);
    assertEquals(set[0].title, testSet.title);
    assertEquals(set[0].owner, user.username);
  },
});

Deno.test({
  name: "Create Set - No Session",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const testSet = { title: "testtitle" };

    const ctx = testing.createMockContext({
      path: "/api/sets/create",
      method: "POST",
      body: ReadableStream.from([JSON.stringify(testSet)]),
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 403);
  },
});

Deno.test({
  name: "Create Set - Invalid Request",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const session = await createSession(db, user);

    const testSet = {
      title: "012345678901234567890123456789012345678901234567890123456789",
    };

    const ctx = testing.createMockContext({
      path: "/api/sets/create",
      method: "POST",
      headers: [["Cookie", `SESSION=${session.token}`]],
      body: ReadableStream.from([
        JSON.stringify(testSet),
      ]), // Long title not permitted.
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 400);
  },
});

Deno.test({
  name: "Delete set - Success",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const set = await createSet(db, user);
    const session = await createSession(db, user);

    const ctx = testing.createMockContext({
      path: `/api/sets/${set.id}`,
      method: "DELETE",
      headers: [["Cookie", `SESSION=${session.token}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 200);
    const set_query = db.sql<{ title: string; owner: string }>`
      SELECT * from Sets
      WHERE id = ${set.id}
    `;
    assertEquals(set_query.length, 0);
  },
});

Deno.test({
  name: "Delete set - No Session",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const set = await createSet(db, user);

    const ctx = testing.createMockContext({
      path: `/api/sets/${set.id}`,
      method: "DELETE",
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 403);
    const set_query = db.sql<{ title: string; owner: string }>`
      SELECT * from Sets
      WHERE id = ${set.id}
    `;
    assertEquals(set_query.length, 1);
    assertEquals(set_query[0].title, set.title);
    assertEquals(set_query[0].owner, user.username);
  },
});

Deno.test({
  name: "Delete set - Not Owner",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user1 = await createUser(db);
    const user2 = await createUser(db);
    const set = await createSet(db, user1);
    const session = await createSession(db, user2);

    const ctx = testing.createMockContext({
      path: `/api/sets/${set.id}`,
      method: "DELETE",
      headers: [["Cookie", `SESSION=${session.token}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 403);
    const set_query = db.sql<{ title: string; owner: string }>`
      SELECT * from Sets
      WHERE id = ${set.id}
    `;
    assertEquals(set_query.length, 1);
    assertEquals(set_query[0].title, set.title);
    assertEquals(set_query[0].owner, user1.username);
  },
});

Deno.test({
  name: "Delete set - Invalid ID",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const set1 = await createSet(db, user);
    const session = await createSession(db, user);

    const ctx = testing.createMockContext({
      path: `/api/sets/${set1.id + "lmnop"}`,
      method: "DELETE",
      headers: [["Cookie", `SESSION=${session.token}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 400);
  },
});

Deno.test({
  name: "Delete set - Nonexistent Set",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const session = await createSession(db, user);

    const ctx = testing.createMockContext({
      path: `/api/sets/${"1111111111111112"}`,
      method: "DELETE",
      headers: [["Cookie", `SESSION=${session.token}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 404);
  },
});

Deno.test({
  name: "Update set - Success (Title)",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const set1 = await createSet(db, user);
    const session = await createSession(db, user);

    const testData = createSetName();

    const ctx = testing.createMockContext({
      path: `/api/sets/${set1.id}`,
      method: "PATCH",
      headers: [["Cookie", `SESSION=${session.token}`]],
      body: ReadableStream.from([
        JSON.stringify({ title: testData }),
      ]),
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, {
      id: set1.id,
      title: testData,
    });
    assertEquals(ctx.response.status, 200);
    const set_query = db.sql<{ title: string; owner: string }>`
      SELECT * from Sets
      WHERE id = ${set1.id}
    `;
    assertEquals(set_query.length, 1);
    assertEquals(set_query[0].owner, user.username);
    assertEquals(set_query[0].title, testData);
  },
});

Deno.test({
  name: "Update set - No Session",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const set1 = await createSet(db, user);

    const ctx = testing.createMockContext({
      path: `/api/sets/${set1.id}`,
      method: "PATCH",
      body: ReadableStream.from([
        JSON.stringify({ title: createSetName() }),
      ]),
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 403);
    const set_query = db.sql<{ title: string; owner: string }>`
      SELECT * from Sets
      WHERE id = ${set1.id}
    `;
    assertEquals(set_query.length, 1);
    assertEquals(set_query[0].owner, set1.owner.username);
    assertEquals(set_query[0].title, set1.title);
  },
});

Deno.test({
  name: "Update set - Not owner",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const user2 = await createUser(db);
    const set1 = await createSet(db, user);
    const session = await createSession(db, user2);

    const setName = createSetName();

    const ctx = testing.createMockContext({
      path: `/api/sets/${set1.id}`,
      method: "PATCH",
      headers: [["Cookie", `SESSION=${session.token}`]],
      body: ReadableStream.from([
        JSON.stringify({ title: setName }),
      ]),
    });

    await mw(ctx, next);
    assertEquals(ctx.response.status, 403);
    const set_query = db.sql<{ title: string; owner: string }>`
      SELECT * from Sets
      WHERE id = ${set1.id}
    `;
    assertEquals(set_query.length, 1);
    assertEquals(set_query[0].owner, set1.owner.username);
    assertEquals(set_query[0].title, set1.title);
  },
});

Deno.test({
  name: "Update set - Nonexistent set",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const session = await createSession(db, user);

    const ctx = testing.createMockContext({
      path: `/api/sets/${"1111111111111112"}`,
      method: "PATCH",
      headers: [["Cookie", `SESSION=${session.token}`]],
      body: ReadableStream.from([
        JSON.stringify({ title: createSetName() }),
      ]),
    });

    await mw(ctx, next);
    assertEquals(ctx.response.status, 404);
  },
});

Deno.test({
  name: "Get Set by ID - Success",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const set1 = await createSet(db, user);
    const card1 = await createCard(db, set1);

    const ctx = testing.createMockContext({
      path: `/api/sets/${set1.id}`,
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, {
      id: set1.id,
      owner: user.username,
      title: set1.title,
      cards: [{
        id: card1.id,
        set_id: set1.id,
        front: card1.front,
        back: card1.back,
      }],
    });
  },
});

Deno.test({
  name: "Get Set by ID - Not Found",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const ctx = testing.createMockContext({
      path: `/api/sets/nonexistent`,
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, { error: "Set not found" });
    assertEquals(ctx.response.status, 404);
  },
});

Deno.test({
  name: "Track Set - Success",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const set1 = await createSet(db, user);
    const session = await createSession(db, user);

    const ctx = testing.createMockContext({
      path: `/api/sets/${set1.id}/track`,
      method: "POST",
      headers: [["Cookie", `SESSION=${session.token}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, { message: "Set successfully tracked" });
    assertEquals(ctx.response.status, 200);

    const trackedSets = db
      .sql`SELECT username, set_id FROM TrackedSets WHERE username = ${user.username}`;
    assertNotEquals(trackedSets.find((x) => x.set_id == set1.id), null);
  },
});

Deno.test({
  name: "Track Set - Already Tracked",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const set1 = await createSet(db, user);
    const session = await createSession(db, user);
    await createTracking(db, user, set1);

    const ctx = testing.createMockContext({
      path: `/api/sets/${set1.id}/track`,
      method: "POST",
      headers: [["Cookie", `SESSION=${session.token}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, { message: "Set already tracked" });
    assertEquals(ctx.response.status, 200);
  },
});

Deno.test({
  name: "Track Set - No Session",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const set1 = await createSet(db, user);

    const ctx = testing.createMockContext({
      path: `/api/sets/${set1.id}/track`,
      method: "POST",
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, { error: NO_SESSION_TOKEN });
    assertEquals(ctx.response.status, 401);
  },
});

Deno.test({
  name: "Track Set - Invalid Session",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const set1 = await createSet(db, user);

    const ctx = testing.createMockContext({
      path: `/api/sets/${set1.id}/track`,
      method: "POST",
      headers: [["Cookie", `SESSION=invalidtoken`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, { error: "Invalid session" });
    assertEquals(ctx.response.status, 401);
  },
});

Deno.test({
  name: "Track Set - Set Not Found",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const session = await createSession(db, user);

    const ctx = testing.createMockContext({
      path: `/api/sets/nonexistent/track`,
      method: "POST",
      headers: [["Cookie", `SESSION=${session.token}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, { error: "Set not found" });
    assertEquals(ctx.response.status, 404);
  },
});

Deno.test({
  name: "Untrack Set - Success",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const set1 = await createSet(db, user);
    const session = await createSession(db, user);
    await createTracking(db, user, set1);

    const ctx = testing.createMockContext({
      path: `/api/sets/${set1.id}/untrack`,
      method: "DELETE",
      headers: [["Cookie", `SESSION=${session.token}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, { message: "Set successfully untracked" });
    assertEquals(ctx.response.status, 200);

    const trackedSets = db
      .sql`SELECT username, set_id FROM TrackedSets WHERE username = ${user.username}`;
    assertEquals(trackedSets, []);
  },
});

Deno.test({
  name: "Untrack Set - Not Tracked",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const set1 = await createSet(db, user);
    const session = await createSession(db, user);

    const ctx = testing.createMockContext({
      path: `/api/sets/${set1.id}/untrack`,
      method: "DELETE",
      headers: [["Cookie", `SESSION=${session.token}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, { message: "Set was not being tracked" });
    assertEquals(ctx.response.status, 200);
  },
});

Deno.test({
  name: "Check if Set is Tracked - True",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const set1 = await createSet(db, user);
    const session = await createSession(db, user);
    await createTracking(db, user, set1);

    const ctx = testing.createMockContext({
      path: `/api/sets/${set1.id}/tracked`,
      method: "GET",
      headers: [["Cookie", `SESSION=${session.token}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, { isTracked: true });
    assertEquals(ctx.response.status, 200);
  },
});

Deno.test({
  name: "Check if Set is Tracked - False",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const set1 = await createSet(db, user);
    const session = await createSession(db, user);

    const ctx = testing.createMockContext({
      path: `/api/sets/${set1.id}/tracked`,
      method: "GET",
      headers: [["Cookie", `SESSION=${session.token}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, { isTracked: false });
    assertEquals(ctx.response.status, 200);
  },
});

Deno.test({
  name: "Get Tracked Sets - Success with No Sets Tracked",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const session = await createSession(db, user);

    const ctx = testing.createMockContext({
      path: `/api/sets/tracked`,
      method: "GET",
      headers: [["Cookie", `SESSION=${session.token}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, {
      id: "tracked",
      owner: user.username,
      title: "Tracked Sets",
      cards: [],
    });
    assertEquals(ctx.response.status, 200);
  },
});

Deno.test({
  name: "Get Tracked Sets - Success with Tracked Sets",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const set1 = await createSet(db, user);
    const card1 = await createCard(db, set1);
    const session = await createSession(db, user);
    await createTracking(db, user, set1);

    const ctx = testing.createMockContext({
      path: `/api/sets/tracked`,
      method: "GET",
      headers: [["Cookie", `SESSION=${session.token}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, {
      id: "tracked",
      owner: user.username,
      title: "Tracked Sets",
      cards: [{
        id: card1.id,
        set_id: set1.id,
        front: card1.front,
        back: card1.back,
      }],
    });
    assertEquals(ctx.response.status, 200);
  },
});

Deno.test({
  name: "Get Tracked Sets - No Session",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const ctx = testing.createMockContext({
      path: `/api/sets/tracked`,
      method: "GET",
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, { error: NO_SESSION_TOKEN });
    assertEquals(ctx.response.status, 401);
  },
});

Deno.test({
  name: "Get Set by ID with Study - No Session",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const set1 = await createSet(db);

    const ctx = testing.createMockContext({
      path: `/api/sets/${set1.id}?study=true`,
      method: "GET",
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, { error: NO_SESSION_TOKEN });
    assertEquals(ctx.response.status, 401);
  },
});

Deno.test({
  name: "Get Set by ID with Study - Success (study=true) - Card Needs Studying",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const set1 = await createSet(db, user);
    // insert a card that needs studying (old last_reviewed time, low points)
    const card1 = await createCard(db, set1);
    await createCardProgress(db, user, card1, 0, createPreviousTime(100000));
    const session = await createSession(db, user);

    const ctx = testing.createMockContext({
      path: `/api/sets/${set1.id}?study=true`,
      method: "GET",
      headers: [["Cookie", `SESSION=${session.token}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, {
      id: set1.id,
      owner: user.username,
      title: set1.title,
      cards: [{
        id: card1.id,
        set_id: set1.id,
        front: card1.front,
        back: card1.back,
      }],
    });
  },
});

Deno.test({
  name: "Get Set by ID with Study - Success (study=true) - No Cards to Study",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const set1 = await createSet(db, user);
    // insert a card that doesn't need studying (recent last_reviewed time, high points)
    const card1 = await createCard(db, set1);
    await createCardProgress(db, user, card1, 10, createPreviousTime(0));
    const session = await createSession(db, user);

    const ctx = testing.createMockContext({
      path: `/api/sets/${set1.id}?study=true`,
      method: "GET",
      headers: [["Cookie", `SESSION=${session.token}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, {
      id: set1.id,
      owner: user.username,
      title: set1.title,
      cards: [],
    });
  },
});

Deno.test({
  name: "Get Set by ID with Study - Success (study=5) - With Points Offset",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const set1 = await createSet(db, user);
    // insert a card where with offset 5 it needs to be studied
    const card1 = await createCard(db, set1);
    await createCardProgress(db, user, card1, 0, createPreviousTime(10000));
    const session = await createSession(db, user);

    const ctx = testing.createMockContext({
      path: `/api/sets/${set1.id}?study=5`,
      method: "GET",
      headers: [["Cookie", `SESSION=${session.token}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, {
      id: set1.id,
      owner: user.username,
      title: set1.title,
      cards: [{
        id: card1.id,
        set_id: set1.id,
        front: card1.front,
        back: card1.back,
      }],
    });
  },
});

Deno.test({
  name: "Get Tracked Sets with Study - Success (study=true) - Multiple Sets",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user1 = await createUser(db);
    const user2 = await createUser(db);

    const set1 = await createSet(db, user1);
    const set2 = await createSet(db, user2);

    const card1 = await createCard(db, set1);
    const card2 = await createCard(db, set2);

    // card progress that makes them need studying
    const oldTime = createPreviousTime(100000);
    await createCardProgress(db, user2, card1, 0, oldTime);
    await createCardProgress(db, user2, card2, 0, oldTime);

    const session = await createSession(db, user2);

    await createTracking(db, user2, set1);
    await createTracking(db, user2, set2);

    const ctx = testing.createMockContext({
      path: `/api/sets/tracked?study=true`,
      method: "GET",
      headers: [["Cookie", `SESSION=${session.token}`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, {
      id: "tracked",
      owner: user2.username,
      title: "Tracked Sets",
      cards: [
        {
          id: card1.id,
          set_id: set1.id,
          front: card1.front,
          back: card1.back,
        },
        {
          id: card2.id,
          set_id: set2.id,
          front: card2.front,
          back: card2.back,
        },
      ],
    });
    assertEquals(ctx.response.status, 200);
  },
});

Deno.test({
  name: "Untrack Set - Invalid Session",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const set1 = await createSet(db);

    const ctx = testing.createMockContext({
      path: `/api/sets/${set1.id}/untrack`,
      method: "DELETE",
      headers: [["Cookie", `SESSION=invalidtoken`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, { error: "Invalid session" });
    assertEquals(ctx.response.status, 401);
  },
});

Deno.test({
  name: "Check if Set is Tracked - Invalid Session",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const set1 = await createSet(db);

    const ctx = testing.createMockContext({
      path: `/api/sets/${set1.id}/tracked`,
      method: "GET",
      headers: [["Cookie", `SESSION=invalidtoken`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, { error: "Invalid session" });
    assertEquals(ctx.response.status, 401);
  },
});

Deno.test({
  name: "Get Tracked Sets - Invalid Session",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const ctx = testing.createMockContext({
      path: `/api/sets/tracked`,
      method: "GET",
      headers: [["Cookie", `SESSION=invalidtoken`]],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, { error: "Invalid session" });
    assertEquals(ctx.response.status, 401);
  },
});

Deno.test({
  name: "Get Sets Owned by User - Success",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Insert test users and sets
    const user = await createUser(db);
    const set1 = await createSet(db, user);
    const set2 = await createSet(db, user);

    const ctx = testing.createMockContext({
      path: `/api/sets/owned/${user.username}`,
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, [
      { id: set1.id, title: set1.title },
      { id: set2.id, title: set2.title },
    ]);
  },
});

Deno.test({
  name: "Search Sets - No Query Parameter",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const ctx = testing.createMockContext({
      path: `/api/sets/search`,
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, { error: "QUERY_PARAMETER_MISSING" });
    assertEquals(ctx.response.status, 400);
  },
});

Deno.test({
  name: "Search Sets - Title Match",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const setTitle = "JavaScript Basics";

    // Insert test users and sets
    const user = await createUser(db);
    const set1 = await createSet(db, user, setTitle);

    const ctx = testing.createMockContext({
      path: `/api/sets/search?q=JavaScript`,
    });

    await mw(ctx, next);

    // Should return the matching set with proper structure
    assertEquals(Array.isArray(ctx.response.body), true);
    const body = ctx.response.body as Array<SearchResult>;
    assertEquals(body.length, 1);
    assertEquals(body[0].id, set1.id);
    assertEquals(body[0].title, set1.title);
    assertEquals(body[0].owner, user.username);
    // Rank should be a number
    assertEquals(typeof body[0].rank, "number");
  },
});

Deno.test({
  name: "Search Sets - Card Content Match",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Insert test users, sets, and cards
    const user = await createUser(db);
    const set1 = await createSet(db, user);
    const card1 = await createCard(
      db,
      set1,
      "What is JavaScript?",
      "A programming language",
    );

    const ctx = testing.createMockContext({
      path: `/api/sets/search?q=JavaScript`,
    });

    await mw(ctx, next);

    // Should return the set that contains a matching card with proper structure
    assertEquals(Array.isArray(ctx.response.body), true);
    const body = ctx.response.body as Array<SearchResult>;
    assertEquals(body.length, 1);
    assertEquals(body[0].id, set1.id);
    assertEquals(body[0].title, set1.title);
    assertEquals(body[0].owner, user.username);
    // Should include card information for card matches
    assertEquals(body[0].card, {
      front: card1.front,
      back: card1.back,
    });
    // Rank should be a number
    assertEquals(typeof body[0].rank, "number");
  },
});

Deno.test({
  name: "Search Sets - Multiple Results with Sort and Limit",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Insert multiple sets to test sorting and limiting
    const user = await createUser(db);
    const setNameWrapper = (i: number) => `Set ${i} about programming`;
    const createSetName = createSmallUniqueLabeled(setNameWrapper);

    for (let i = 0; i < 25; i++) {
      createSet(db, user, createSetName());
    }

    const ctx = testing.createMockContext({
      path: `/api/sets/search?q=programming`,
    });

    await mw(ctx, next);

    // Should return at most 20 results
    assertEquals(Array.isArray(ctx.response.body), true);
    const body = ctx.response.body as Array<SearchResult>;
    assertEquals(body.length <= 20, true);
    assertEquals(body.length, 20); // Should be exactly 20 since we have more than 20 matches

    // Check that results are properly structured
    for (const result of body) {
      assertEquals(typeof result.id, "string");
      assertEquals(typeof result.title, "string");
      assertEquals(typeof result.owner, "string");
      assertEquals(typeof result.rank, "number");
      // Card should be null for title matches
      assertEquals(result.card, null);
    }

    // Check that results are sorted by rank (ascending - best matches first)
    for (let i = 0; i < body.length - 1; i++) {
      const currentRank = body[i].rank;
      const nextRank = body[i + 1].rank;
      assertEquals(currentRank <= nextRank, true);
    }
  },
});

Deno.test({
  name: "Search Sets - Title and Card Matches Combined",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Insert test users, sets, and cards
    const user = await createUser(db);
    const titleSet = await createSet(db, user, "JavaScript Guide");
    const cardSet = await createSet(db, user, "Programming Basics");
    const card2 = await createCard(
      db,
      cardSet,
      "What is JavaScript?",
      "A programming language",
    );

    const ctx = testing.createMockContext({
      path: `/api/sets/search?q=JavaScript`,
    });

    await mw(ctx, next);

    // Should return both the title match and card content match
    assertEquals(Array.isArray(ctx.response.body), true);
    const body = ctx.response.body as Array<SearchResult>;
    assertEquals(body.length, 2);

    // Find which result is which based on ID
    const titleMatch = body.find((item) => item.id === titleSet.id)!;
    const cardMatch = body.find((item) => item.id === cardSet.id)!;

    // Check title match result
    assertEquals(titleMatch.id, titleSet.id);
    assertEquals(titleMatch.title, titleSet.title);
    assertEquals(titleMatch.owner, user.username);
    assertEquals(titleMatch.card, null); // Title matches should have null card

    // Check card match result
    assertEquals(cardMatch.id, cardSet.id);
    assertEquals(cardMatch.title, cardSet.title);
    assertEquals(cardMatch.owner, user.username);
    assertEquals(cardMatch.card, {
      front: card2.front,
      back: card2.back,
    });

    // Check that results are sorted by rank
    if (body.length > 1) {
      assertEquals(
        body[0].rank <= body[1].rank,
        true,
      );
    }
  },
});

Deno.test({
  name: "Get Tracked Sets List - Success",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db);
    const set1 = await createSet(db, user);
    const set2 = await createSet(db, user);
    const session = await createSession(db, user);
    await createTracking(db, user, set1);
    await createTracking(db, user, set2);

    const ctx = testing.createMockContext({
      path: `/api/sets/tracked/list`,
      method: "GET",
      headers: [["Cookie", `SESSION=${session.token}`]],
    });

    await mw(ctx, next);

    assertEquals(Array.isArray(ctx.response.body), true);
    const body = ctx.response.body as TrackedListResponse;
    assertEquals(body.length, 2);

    // Check that both tracked sets are returned
    const returnedIds = body.map((item) => item.id);
    assertEquals(returnedIds.includes(set1.id), true);
    assertEquals(returnedIds.includes(set2.id), true);

    // Check that each item has the expected structure
    for (const item of body) {
      assertEquals(typeof item.id, "string");
      assertEquals(typeof item.owner, "string");
      assertEquals(typeof item.title, "string");
    }
  },
});

Deno.test({
  name: "Get Tracked Sets List - No Session",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const ctx = testing.createMockContext({
      path: `/api/sets/tracked/list`,
      method: "GET",
    });

    await mw(ctx, next);

    assertEquals(ctx.response.body, { error: NO_SESSION_TOKEN });
    assertEquals(ctx.response.status, 401);
  },
});
