import { Router } from "jsr:@oak/oak";

import { Database } from "@db/sqlite";
import { pbkdf2Sync } from "node:crypto";
import { generateSessionToken } from "../utils/sessionkey.ts";

export function createAuthRouter(db: Database) {
  const router = new Router();

  router.get("/", (ctx) => {
    ctx.response.body = "GET /auth";
    ctx.response.status = 404;
  });

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

    const salt =
      db.sql`SELECT salt FROM Users WHERE username = ${body.username};`[0]
        ?.salt;

    if (!salt) {
      // Get their salt, and check if the user exists.
      ctx.response.body = { error: "INVALID_CREDENTIALS" };
      ctx.response.status = 403;
      return;
    }

    const hashedPassword = pbkdf2Sync(
      body.password,
      salt,
      100000,
      64,
      "sha256",
    ).toString("hex");

    const user =
      db.sql`SELECT username FROM Users WHERE username = ${body.username} AND hash = ${hashedPassword};`[0]
        ?.username;
    if (!user) {
      // Check if the password is correct.
      ctx.response.body = { error: "INVALID_CREDENTIALS" };
      ctx.response.status = 403;
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

  router.post("/logout", async (ctx) => {
    const SESSION = await ctx.cookies.get("SESSION");
    if (!SESSION) {
      ctx.response.status = 200;
      return;
    }
    db.sql`DELETE FROM Sessions WHERE token = ${SESSION};`;
    ctx.cookies.delete("SESSION");
    ctx.response.status = 200;
  });

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

    const salt = crypto
      .getRandomValues(new Uint8Array(16))
      .reduce((acc, byte) => acc + byte.toString(16).padStart(2, "0"), "");

    const hashedPassword = pbkdf2Sync(
      body.password,
      salt,
      100000,
      64,
      "sha256",
    ).toString("hex");

    if (
      db.sql`SELECT username FROM Users WHERE username = ${body.username};`[0]
        ?.username
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
