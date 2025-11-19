import { testing } from "@oak/oak";
import { assertEquals } from "@std/assert";
import { initializeDB, memDB } from "../db.ts";
import { createAPIRouter } from "./combined.ts";
import { NO_SESSION_TOKEN } from "./constants.ts";

Deno.test({
  name: "Make Set",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${"testuser"}, ${"testemail@service.webemail"}, ${"c297e57206c7aee60fe2ede4bee13021542d0d472fa690c76557cdccf8610cc6cc63ff0d6f6a2f6433c577c5326d3023aabdedd04e453b43bfe1fd1ccc9cb728"}, ${"salt"})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${"testuser"}, ${"token"}, ${
      Date.now() + 60 * 60 * 24
    })`;

    let setCtx = testing.createMockContext({
      path: "/api/sets/",
      method: "POST",
    });

    await mw(setCtx, next);

    assertEquals(setCtx.response.status, 404);
    assertEquals(setCtx.response.body, { error: NO_SESSION_TOKEN });

    // Test with valid session
    setCtx = testing.createMockContext({
      path: "/api/sets/",
      method: "POST",
      body: ReadableStream.from([
        JSON.stringify({ title: "Test Set" }),
      ]),
      headers: [["Content-Type", "application/json"]],
    });

    setCtx.cookies.set("SESSION", "token");

    await mw(setCtx, next);

    assertEquals(setCtx.response.status, 200);
    const result = setCtx.response.body as Record<string, unknown>;
    assertEquals(typeof result.id, "number");
  },
});

Deno.test({
  name: "Get All Sets",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${"testuser"}, ${"test@test.com"}, ${"hash"}, ${"salt"})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${"testuser"}, ${"token"}, ${
      Date.now() + 60 * 60 * 24
    })`;
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${"0000000000000001"}, ${"testuser"}, ${"Test Set 1"})`;
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${"0000000000000002"}, ${"testuser"}, ${"Test Set 2"})`;

    const ctx = testing.createMockContext({
      path: "/api/sets/",
      method: "GET",
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 401);

    ctx.cookies.set("SESSION", "token");
    await mw(ctx, next);

    assertEquals(ctx.response.status, 200);
    const sets = ctx.response.body as Record<string, unknown>[];
    assertEquals(sets.length, 2);
  },
});

Deno.test({
  name: "Get Set by ID",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${"testuser"}, ${"test@test.com"}, ${"hash"}, ${"salt"})`;
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${"0000000000000001"}, ${"testuser"}, ${"Test Set"})`;

    const setId = "0000000000000001";

    const ctx = testing.createMockContext({
      path: `/api/sets/${setId}`,
      method: "GET",
      params: { setId: String(setId) },
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 200);
    const set = ctx.response.body as Record<string, unknown>[];
    assertEquals(set[0].title, "Test Set");
  },
});

Deno.test({
  name: "Delete Set",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${"testuser"}, ${"test@test.com"}, ${"hash"}, ${"salt"})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${"testuser"}, ${"token"}, ${
      Date.now() + 60 * 60 * 24
    })`;
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${"0000000000000001"}, ${"testuser"}, ${"Test Set"})`;

    const setId = "0000000000000001";

    const ctx = testing.createMockContext({
      path: `/api/sets/${setId}`,
      method: "DELETE",
      params: { setId: String(setId) },
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 401);

    ctx.cookies.set("SESSION", "token");
    await mw(ctx, next);

    assertEquals(ctx.response.status, 200);

    const remaining = db.sql`SELECT * FROM Sets WHERE id = ${setId}`;
    assertEquals(remaining.length, 0);
  },
});

Deno.test({
  name: "Get Set Progress",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${"testuser"}, ${"test@test.com"}, ${"hash"}, ${"salt"})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${"testuser"}, ${"token"}, ${
      Date.now() + 60 * 60 * 24
    })`;
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${"0000000000000001"}, ${"testuser"}, ${"Test Set"})`;

    const setId = "0000000000000001";

    const ctx = testing.createMockContext({
      path: `/api/sets/${setId}/progress`,
      method: "GET",
      params: { setId: String(setId) },
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 401);

    ctx.cookies.set("SESSION", "token");
    await mw(ctx, next);

    assertEquals(ctx.response.status, 200);
  },
});

Deno.test({
  name: "Update Set (PATCH)",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${"testuser"}, ${"test@test.com"}, ${"hash"}, ${"salt"})`;
    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${"newowner"}, ${"newowner@test.com"}, ${"hash"}, ${"salt"})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${"testuser"}, ${"token"}, ${
      Date.now() + 60 * 60 * 24
    })`;
    db.sql`INSERT INTO Sets (id, owner, title) VALUES (${"0000000000000001"}, ${"testuser"}, ${"Old Title"})`;

    const setId = "0000000000000001";

    const ctx = testing.createMockContext({
      path: `/api/sets/${setId}`,
      method: "PATCH",
      params: { setId: String(setId) },
    });

    // Test without session
    await mw(ctx, next);
    assertEquals(ctx.response.status, 403);

    // Test with valid session and update
    ctx.cookies.set("SESSION", "token");
    const updateData = { newOwner: "newowner", newTitle: "Updated Title" };

    // Mock the request body
    Object.defineProperty(ctx.request, "body", {
      value: {
        type: () => "json",
        json: () => Promise.resolve(updateData),
      },
      writable: true,
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 200);
    const result = ctx.response.body as Record<string, unknown>;
    assertEquals(result.title, "Updated Title");
    assertEquals(result.owner, "newowner");

    // Verify database was updated
    const updated = db.sql`SELECT * FROM Sets WHERE id = ${setId}`;
    assertEquals(updated[0].title, "Updated Title");
    assertEquals(updated[0].owner, "newowner");
  },
});
