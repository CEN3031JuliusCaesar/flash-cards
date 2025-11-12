import { Router } from "@oak/oak";
import { INVALID_REQUEST, NO_SESSION_TOKEN, UNAUTHORIZED } from "./constants.ts";

import { Snowflake } from "../utils/snowflake.ts";

import { Database } from "@db/sqlite";



export function createCardRouter(db: Database) {
 const setsRouter = new Router();

/**
 * Create a new set.
 * Requires a valid SESSION cookie. Set will be added to authed user's account.
 * Request JSON must include the value "title" which is the title of the set (max 50 characters).
 * Returns the set object:
 * {
    id: SNOWFLAKE,
    owner: USERNAME,
    title: title,
  }
 */
setsRouter.post("/create", async (ctx) => {

  console.info("POST /sets/create");

  const SESSION = await ctx.cookies.get("SESSION");
  const USERNAME = db.sql`SELECT username FROM Sessions 
  WHERE token = ${SESSION} 
  AND expires > current_timestamp;`[0];

  if (SESSION == null) {
    ctx.response.body = {
      error: NO_SESSION_TOKEN,
    };
    ctx.response.status = 403;
    return;
  }

  if (USERNAME === undefined) {
    ctx.response.body = {
      error: UNAUTHORIZED,
    };
    ctx.response.status = 403;
    return;
  }
  
  if (ctx.request.body.type() !== "json") {
    console.log(await ctx.request.body.json());
    ctx.response.body = {
      error: INVALID_REQUEST,
    };
    ctx.response.status = 400;
    return;
  }
  const { title } = await ctx.request.body.json();
  
  if (typeof title !== "string" || title.length === 0 || title.length > 50) {
    ctx.response.body = {
      error: INVALID_REQUEST,
    };
    ctx.response.status = 400;
    return;
  }
  
  const SNOWFLAKE = Snowflake.generate();

  db.sql`INSERT INTO Sets (id, owner, title) 
  VALUES (${SNOWFLAKE}, ${USERNAME}, ${title});`;

  ctx.response.body = {
    id: SNOWFLAKE,
    owner: USERNAME,
    title: title,
  }
  ctx.response.status = 200;
});

/**
 * Update a set's owner or title. If you want to update one or the other, just put the old one in the request JSON.
 */
setsRouter.patch("/:setId", async (ctx) => {
  const { setId } = ctx.params;

  console.info(`PATCH /sets/${setId}`);

  const SESSION = await ctx.cookies.get("SESSION");
  const USERNAME = db.sql`SELECT username FROM Sessions 
  WHERE token = ${SESSION} 
  AND expires > current_timestamp;`;

  



  // Must be set owner to change ownership or title.
  if (SESSION == null) {
    ctx.response.body = {
      error: NO_SESSION_TOKEN,
    };
    ctx.response.status = 403;
    return;
  }

  // Validate setId is a snowflake.
  if (!Snowflake.isSnowflake(setId!)) {
    ctx.response.body = {
      error: "INVALID_SET_ID",
    };
    ctx.response.status = 400;
    return;
  }

  const SET = db.sql`SELECT * FROM Sets 
    WHERE id = ${setId} 
    AND Owner = ${USERNAME};`;

  // Validate that the set exists.
  if (SET.length === 0) {
    ctx.response.body = {
      error: "SET_NOT_FOUND",
    };
    ctx.response.status = 404;
    return;
  }

  if (ctx.request.body.type() !== "json") {
    console.log(await ctx.request.body.json());
    ctx.response.body = {
      error: INVALID_REQUEST,
    };
    ctx.response.status = 400;
    return;
  }

  const { newOwner, newTitle } = await ctx.request.body.json();

  // Validate newOwner is valid username.
  if (typeof newOwner !== "string" || newOwner.length === 0 || newOwner.length > 32 || db.sql`SELECT * FROM Users WHERE username = ${newOwner};`[0] !== undefined) {
    ctx.response.body = {
      error: INVALID_REQUEST,
    };
    ctx.response.status = 400;
    return;
  }

  // Validate newTitle is valid title.
  if(typeof newTitle !== "string" || newTitle.length === 0 || newTitle.length > 50) {
    ctx.response.body = {
      error: INVALID_REQUEST,
    };
    ctx.response.status = 400;
    return;
  }

  db.sql`UPDATE Sets 
  SET owner = ${newOwner}, title = ${newTitle} 
  WHERE id = ${setId};`;

  ctx.response.body = {
    id: setId,
    owner: newOwner,
    title: newTitle,
  }
  ctx.response.status = 200;
  return;
});


return setsRouter
}