import { testing } from "@oak/oak";
import { assert, assertEquals } from "@std/assert";
import { initializeDB, memDB } from "../db.ts";
import { createAPIRouter } from "./combined.ts";

Deno.test({
  name: "Account Creation",
  async fn() {
    const db = memDB();

    initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const registerCtx = testing.createMockContext({
      path: "/api/auth/register",
      method: "POST",
      body: ReadableStream.from([
        JSON.stringify({
          username: "testuser",
          password: "mypassword123",
          email: "testemail@service.webemail",
        }),
      ]),
      headers: [["Content-Type", "application/json"]],
    });

    await mw(registerCtx, next);

    assertEquals(registerCtx.response.body, undefined);

    assertEquals(db.sql`SELECT email, username FROM Users;`, [
      {
        username: "testuser",
        email: "testemail@service.webemail",
      },
    ]);
  },
});

Deno.test({
  name: "Session Creation",
  async fn() {
    const db = memDB();

    initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${"testuser"}, ${"testemail@service.webemail"}, ${"c297e57206c7aee60fe2ede4bee13021542d0d472fa690c76557cdccf8610cc6cc63ff0d6f6a2f6433c577c5326d3023aabdedd04e453b43bfe1fd1ccc9cb728"}, ${"salt"})`;

    const loginCtx = testing.createMockContext({
      path: "/api/auth/login",
      method: "POST",
      body: ReadableStream.from([
        JSON.stringify({
          username: "testuser",
          password: "mypassword123",
        }),
      ]),
      headers: [["Content-Type", "application/json"]],
    });

    await mw(loginCtx, next);

    assertEquals(loginCtx.response.body, undefined);

    assert(
      typeof loginCtx.response.headers.get("set-cookie") == "string",
      "Session should be a string after login.",
    );

    const session = loginCtx.response.headers
      .get("set-cookie")
      ?.split(";")[0]
      .slice(8);

    assertEquals(db.sql`SELECT username, token FROM Sessions;`, [
      {
        username: "testuser",
        token: session,
      },
    ]);
  },
});

Deno.test({
  name: "Session Deletion",
  async fn() {
    const db = memDB();

    initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${"testuser"}, ${"testemail@service.webemail"}, ${"c297e57206c7aee60fe2ede4bee13021542d0d472fa690c76557cdccf8610cc6cc63ff0d6f6a2f6433c577c5326d3023aabdedd04e453b43bfe1fd1ccc9cb728"}, ${"salt"})`;
    db.sql`INSERT INTO Sessions (username, token) VALUES (${"testuser"}, ${"token"})`;

    const loginCtx = testing.createMockContext({
      path: "/api/auth/logout",
      method: "POST",
      headers: [["Cookie", `SESSION=token`]],
    });

    await mw(loginCtx, next);

    assertEquals(loginCtx.response.body, undefined);

    console.log(loginCtx.response.headers);

    assert(
      typeof loginCtx.response.headers.get("set-cookie") == "string",
      "Session should be set to empty.",
    );

    const session = loginCtx.response.headers
      .get("set-cookie")
      ?.split(";")[0]
      .slice(8);

    assertEquals(session?.length, 0, "Session should be cleared.");

    assertEquals(db.sql`SELECT username, token FROM Sessions;`, []);
  },
});
