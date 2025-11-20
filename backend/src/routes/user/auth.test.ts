import { testing } from "@oak/oak";
import { assert, assertEquals } from "@std/assert";
import { initializeDB, memDB } from "../../db.ts";
import { createAPIRouter } from "../combined.ts";
import {
  createPassword,
  createSession,
  createUser,
  createUsername,
} from "../../utils/testing.ts";

Deno.test({
  name: "Account Creation",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const username = createUsername();
    const password = createPassword();
    const email = `${username}@service.webemail`;

    const registerCtx = testing.createMockContext({
      path: "/api/user/auth/register",
      method: "POST",
      body: ReadableStream.from([
        JSON.stringify({
          username: username,
          password: password,
          email: email,
        }),
      ]),
      headers: [["Content-Type", "application/json"]],
    });

    await mw(registerCtx, next);

    assertEquals(registerCtx.response.body, undefined);

    assertEquals(db.sql`SELECT email, username FROM Users;`, [
      {
        username: username,
        email: email,
      },
    ]);
  },
});

Deno.test({
  name: "Session Creation",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(
      db,
    );

    const loginCtx = testing.createMockContext({
      path: "/api/user/auth/login",
      method: "POST",
      body: ReadableStream.from([
        JSON.stringify({
          username: user.username,
          password: user.password,
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
        username: user.username,
        token: session,
      },
    ]);
  },
});

Deno.test({
  name: "Session Deletion",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(
      db,
    );
    const session = await createSession(db, user);

    const logoutCtx = testing.createMockContext({
      path: "/api/user/auth/logout",
      method: "DELETE",
      headers: [["Cookie", `SESSION=${session.token}`]],
    });

    await mw(logoutCtx, next);

    assertEquals(logoutCtx.response.body, undefined);

    assert(
      typeof logoutCtx.response.headers.get("set-cookie") == "string",
      "Session should be set to empty.",
    );

    const clearedSession = logoutCtx.response.headers
      .get("set-cookie")
      ?.split(";")[0]
      .slice(8);

    assertEquals(clearedSession?.length, 0, "Session should be cleared.");

    assertEquals(db.sql`SELECT username, token FROM Sessions;`, []);
  },
});
