import { testing } from "@oak/oak";
import { assert, assertEquals } from "@std/assert";
import { initializeDB, memDB } from "../../db.ts";
import { createAPIRouter } from "../combined.ts";
import { pbkdf2, toHex } from "../../utils/hashing.ts";

const TEST_USERNAME = "testuser";
const TEST_PASSWORD = "mypassword123";
const TEST_EMAIL = "testemail@service.webemail";
const TEST_SALT = "73616c74"; // hex for 'salt'
const TEST_SESSION_TOKEN = "token";

Deno.test({
  name: "Account Creation",
  async fn() {
    const db = memDB();

    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const registerCtx = testing.createMockContext({
      path: "/api/user/auth/register",
      method: "POST",
      body: ReadableStream.from([
        JSON.stringify({
          username: TEST_USERNAME,
          password: TEST_PASSWORD,
          email: TEST_EMAIL,
        }),
      ]),
      headers: [["Content-Type", "application/json"]],
    });

    await mw(registerCtx, next);

    assertEquals(registerCtx.response.body, undefined);

    assertEquals(db.sql`SELECT email, username FROM Users;`, [
      {
        username: TEST_USERNAME,
        email: TEST_EMAIL,
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

    const hashedPassword = toHex(
      await pbkdf2(TEST_PASSWORD, TEST_SALT),
    );

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${hashedPassword}, ${TEST_SALT})`;

    const loginCtx = testing.createMockContext({
      path: "/api/user/auth/login",
      method: "POST",
      body: ReadableStream.from([
        JSON.stringify({
          username: TEST_USERNAME,
          password: TEST_PASSWORD,
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
        username: TEST_USERNAME,
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

    const hashedPassword = toHex(
      await pbkdf2(TEST_PASSWORD, TEST_SALT),
    );

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${hashedPassword}, ${TEST_SALT})`;
    db.sql`INSERT INTO Sessions (username, token) VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN})`;

    const loginCtx = testing.createMockContext({
      path: "/api/user/auth/logout",
      method: "DELETE",
      headers: [["Cookie", `SESSION=${TEST_SESSION_TOKEN}`]],
    });

    await mw(loginCtx, next);

    assertEquals(loginCtx.response.body, undefined);

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
