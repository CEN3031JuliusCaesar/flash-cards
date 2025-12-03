import { Router } from "@oak/oak";
import type { Database } from "@db/sqlite";
import { UNAUTHORIZED } from "../constants.ts";
import { getSession } from "../../utils/sessionkey.ts";
import type {
  UsersSessionView,
  UsersSettingsView,
} from "../../types/database.ts";

export function createProfileRouter(db: Database) {
  const router = new Router();

  // Get current user's info (username and isAdmin)
  router.get("/me", async (ctx) => {
    const usernameFromSession = await getSession(ctx, db);
    if (!usernameFromSession) return;

    // Get the current user from the session
    const sessionUser = db.sql<UsersSessionView>`
      SELECT u.username, u.is_admin
      FROM Users u
      WHERE u.username = ${usernameFromSession};
    `;

    // This shouldn't ever occur, but lets be pedantic
    if (sessionUser.length === 0) {
      ctx.response.body = { error: "INVALID_SESSION" };
      ctx.response.status = 401;
      return;
    }

    ctx.response.body = {
      username: sessionUser[0].username,
      is_admin: Boolean(sessionUser[0].is_admin),
    };
  });

  // Get user's profile picture id and description by username
  router.get("/:username", (ctx) => {
    const { username } = ctx.params;

    const data = db.sql<UsersSettingsView>`
      SELECT pic_id, description, is_admin
      FROM Users
      WHERE username = ${username};
    `;

    if (data.length === 0) {
      ctx.response.body = { error: "USER_NOT_FOUND" };
      ctx.response.status = 404;
      return;
    }

    ctx.response.body = {
      ...data[0],
      is_admin: Boolean(data[0].is_admin),
    };
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

  // Delete user account - can delete own account or any account if admin
  router.delete("/:username", async (ctx) => {
    const usernameFromSession = await getSession(ctx, db);
    if (!usernameFromSession) return; // getSession already set the response

    const { username } = ctx.params;

    // Check if the target user exists first
    const targetUser = db.sql<UsersSessionView>`
      SELECT u.username, u.is_admin
      FROM Users u
      WHERE u.username = ${username};
    `;

    if (targetUser.length === 0) {
      ctx.response.body = { error: "USER_NOT_FOUND" };
      ctx.response.status = 404;
      return;
    }

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

    // Check if the current user is the target user or an admin
    if (currentUser.username !== username && !currentUser.is_admin) {
      ctx.response.body = { error: UNAUTHORIZED };
      ctx.response.status = 403;
      return;
    }

    // Prevent admin from deleting the last admin account
    if (targetUser[0].is_admin) {
      const adminCount = db.sql<{ count: number }>`
        SELECT COUNT(*) as count
        FROM Users
        WHERE is_admin = 1;
      `[0].count;

      if (adminCount <= 1) {
        ctx.response.body = { error: "CANNOT_DELETE_LAST_ADMIN" };
        ctx.response.status = 400;
        return;
      }
    }

    // Perform the account deletion by removing the user
    db.sql`DELETE FROM Users WHERE username = ${username};`;

    ctx.response.status = 200;
    ctx.response.body = { message: "Account deleted successfully" };
  });

  // Update user admin status - can only be performed by admins
  router.put("/admin/:username", async (ctx) => {
    const usernameFromSession = await getSession(ctx, db);
    if (!usernameFromSession) return; // getSession already set the response

    const { username } = ctx.params;

    if (ctx.request.body.type() !== "json") {
      ctx.response.body = { error: "INVALID_REQUEST" };
      ctx.response.status = 400;
      return;
    }

    const body = await ctx.request.body.json();

    if (typeof body.is_admin !== "boolean") {
      ctx.response.body = { error: "INVALID_REQUEST" };
      ctx.response.status = 400;
      return;
    }

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

    // Check if the current user is an admin
    if (!currentUser.is_admin) {
      ctx.response.body = { error: UNAUTHORIZED };
      ctx.response.status = 403;
      return;
    }

    // Check if the target user exists
    const targetUser = db.sql<UsersSessionView>`
      SELECT u.username, u.is_admin
      FROM Users u
      WHERE u.username = ${username};
    `;

    if (targetUser.length === 0) {
      ctx.response.body = { error: "USER_NOT_FOUND" };
      ctx.response.status = 404;
      return;
    }

    // Prevent admin from removing admin status from the last admin
    if (targetUser[0].is_admin && !body.is_admin) {
      const adminCount = db.sql<{ count: number }>`
        SELECT COUNT(*) as count
        FROM Users
        WHERE is_admin = 1;
      `[0].count;

      if (adminCount <= 1) {
        ctx.response.body = { error: "CANNOT_REMOVE_LAST_ADMIN" };
        ctx.response.status = 400;
        return;
      }
    }

    // Update the user's admin status
    db.sql`
      UPDATE Users
      SET is_admin = ${body.is_admin ? 1 : 0}
      WHERE username = ${username};
    `;

    ctx.response.status = 200;
    ctx.response.body = {
      message: body.is_admin
        ? "User promoted to admin successfully"
        : "User admin status removed successfully",
    };
  });

  return router;
}
