import { Router } from "@oak/oak";
import type { Database } from "@db/sqlite";
import { UNAUTHORIZED } from "../constants.ts";
import { getSession } from "../../utils/sessionkey.ts";
import type { UsersSessionView, UsersSettingsView } from "../../types/database.ts";

export function createProfileRouter(db: Database) {
  const router = new Router();

  // Get user's profile picture id and description by username
  router.get("/:username", (ctx) => {
    const { username } = ctx.params;

    const data = db.sql<UsersSettingsView>`
      SELECT pic_id, description
      FROM Users
      WHERE username = ${username};
    `;

    if (data.length === 0) {
      ctx.response.body = { error: "USER_NOT_FOUND" };
      ctx.response.status = 404;
      return;
    }

    ctx.response.body = data[0];
  });

  // Update user's profile picture id and description
  router.patch("/:username", async (ctx) => {
    const usernameFromSession = await getSession(ctx, db);
    if (!usernameFromSession) return;

    const { username } = ctx.params;

    // Get the current user from the session
    const sessionUser = db.sql<UsersSessionView>`
      SELECT u.username, u.is_admin
      FROM Users u
      WHERE u.username = ${usernameFromSession};
    `;

    if (sessionUser.length === 0) {
      ctx.response.body = { error: "INVALID_SESSION" };
      ctx.response.status = 401;
      return;
    }

    const currentUser = sessionUser[0];

    // Check if the current user is the owner or an admin
    if (currentUser.username !== username && !currentUser.is_admin) {
      ctx.response.body = { error: UNAUTHORIZED };
      ctx.response.status = 403;
      return;
    }

    if (ctx.request.body.type() !== "json") {
      ctx.response.body = { error: "INVALID_REQUEST" };
      ctx.response.status = 400;
      return;
    }

    const body = await ctx.request.body.json();

    // Update the profile picture if provided
    if (body.pic_id !== undefined) {
      if (
        typeof body.pic_id !== "number" || body.pic_id < 0 || body.pic_id > 7
      ) {
        ctx.response.body = { error: "INVALID_PIC_ID" };
        ctx.response.status = 400;
        return;
      }

      db.sql`
        UPDATE Users
        SET pic_id = ${body.pic_id}
        WHERE username = ${username};
      `;
    }

    // Update the description if provided
    if (body.description !== undefined) {
      if (
        typeof body.description !== "string" || body.description.length > 250
      ) {
        ctx.response.body = { error: "INVALID_DESCRIPTION" };
        ctx.response.status = 400;
        return;
      }

      db.sql`
        UPDATE Users
        SET description = ${body.description}
        WHERE username = ${username};
      `;
    }

    ctx.response.status = 200;
    ctx.response.body = { message: "Profile updated successfully" };
  });

  return router;
}
