import { Router } from "@oak/oak";
import { Database } from "@db/sqlite";
import { generateSessionToken } from "../../utils/sessionkey.ts";
import { genSalt, pbkdf2, toHex } from "../../utils/hashing.ts";
import { INVALID_CREDENTIALS } from "../constants.ts";
import { UsersSaltView, UsersUsernameView } from "../../types/database.ts";

export function createAuthRouter(db: Database) {
  const router = new Router();

  router.get("/", (ctx) => {
    ctx.response.body = "GET /auth";
    ctx.response.status = 404;
  });

  // Login endpoint - Creates a session for a user after validating credentials
  router.post("/login", async (ctx) => {
    if (ctx.request.body.type() !== "json") {
      ctx.response.body = { error: "INVALID_REQUEST" };
      ctx.response.status = 400;
      return;
    }

    const body = await ctx.request.body.json();

    if (
      typeof body.username !== "string" ||
      typeof body.password !== "string"
    ) {
      ctx.response.body = { error: "INVALID_REQUEST" };
      ctx.response.status = 400;
      return;
    }

    const salt = db
      .sql<UsersSaltView>`
        SELECT salt FROM Users WHERE username = ${body.username};
      `[0]?.salt;

    if (!salt) {
      // Get their salt, and check if the user exists.
      ctx.response.body = { error: INVALID_CREDENTIALS };
      ctx.response.status = 401;
      return;
    }

    const hashedPassword = toHex(
      await pbkdf2(body.password, salt),
    );

    const user = (
      db.sql<UsersUsernameView>`
        SELECT username FROM Users WHERE
          username = ${body.username} AND
          hash = ${hashedPassword};
      `
    )[
      0
    ]
      ?.username;
    if (!user) {
      // Check if the password is correct.
      ctx.response.body = { error: INVALID_CREDENTIALS };
      ctx.response.status = 401;
      return;
    }

    const newSessionToken = generateSessionToken();

    db.sql`INSERT INTO Sessions (username, token) VALUES (${user}, ${newSessionToken});`;
    ctx.cookies.set("SESSION", newSessionToken, {
      httpOnly: true,
      maxAge: 48 * 60 * 60,
      path: "/",
    });
    ctx.response.status = 200;
  });

  // Logout endpoint - Removes the user's session and clears the cookie
  router.delete("/logout", async (ctx) => {
    const session = await ctx.cookies.get("SESSION");
    if (!session) {
      ctx.response.status = 200;
      return;
    }
    db.sql`DELETE FROM Sessions WHERE token = ${session};`;
    ctx.cookies.delete("SESSION");
    ctx.response.status = 200;
  });

  // Register endpoint - Creates a new user account with hashed password
  router.post("/register", async (ctx) => {
    if (ctx.request.body.type() !== "json") {
      ctx.response.body = { error: "INVALID_REQUEST" };
      ctx.response.status = 400;
      return;
    }

    const body = await ctx.request.body.json();

    if (
      typeof body.username !== "string" ||
      typeof body.password !== "string" ||
      typeof body.email !== "string"
    ) {
      ctx.response.body = { error: "INVALID_REQUEST" };
      ctx.response.status = 400;
      return;
    }

    const salt = genSalt();

    const hashedPassword = toHex(
      await pbkdf2(body.password, salt),
    );

    if (
      db.sql<UsersUsernameView>`
        SELECT username FROM Users WHERE username = ${body.username};
      `[0]?.username
    ) {
      ctx.response.body = { error: "USERNAME_TAKEN" };
      ctx.response.status = 409;
      return;
    }

    db.sql`INSERT INTO Users (username, email, hash, salt) VALUES (${body.username}, ${body.email}, ${hashedPassword}, ${salt});`;
    ctx.response.status = 201;
  });

  return router;
}
