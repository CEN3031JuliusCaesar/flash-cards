import { testing } from "@oak/oak";
import { assertEquals } from "@std/assert";
import { initializeDB, memDB } from "../../db.ts";
import { createAPIRouter } from "../combined.ts";
import { createSession, createUser } from "../../utils/testing.ts";
import { UNAUTHORIZED } from "../constants.ts";

Deno.test({
  name: "Get User Profile - Success",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Create user with profile information
    const user = await createUser(
      db,
      "testuser",
      undefined,
      "Test description",
      3,
    );

    const ctx = testing.createMockContext({
      path: `/api/user/profile/${user.username}`,
      method: "GET",
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 200);
    assertEquals(ctx.response.body, {
      pic_id: 3,
      description: "Test description",
    });
  },
});

Deno.test({
  name: "Get User Profile - User Not Found",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const ctx = testing.createMockContext({
      path: `/api/user/profile/nonexistentuser`,
      method: "GET",
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 404);
    assertEquals(ctx.response.body, { error: "USER_NOT_FOUND" });
  },
});

Deno.test({
  name: "Update User Profile - By Owner",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Create user with profile information
    const user = await createUser(
      db,
      "testuser",
      undefined,
      "Old description",
      2,
    );
    const session = await createSession(db, user);

    const ctx = testing.createMockContext({
      path: `/api/user/profile/${user.username}`,
      method: "PATCH",
      body: ReadableStream.from([
        JSON.stringify({
          pic_id: 5,
          description: "New description",
        }),
      ]),
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${session.token}`],
      ],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 200);
    assertEquals(ctx.response.body, {
      message: "Profile updated successfully",
    });

    // Verify the changes were applied in the database
    const updatedUser = db
      .sql`SELECT pic_id, description FROM Users WHERE username = ${user.username};`;

    assertEquals(updatedUser, [{
      pic_id: 5,
      description: "New description",
    }]);
  },
});

Deno.test({
  name: "Update User Profile - By Admin",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Create regular user and admin user
    const user = await createUser(
      db,
      "testuser",
      undefined,
      "Old description",
      1,
    );
    const adminUser = await createUser(
      db,
      "adminuser",
      undefined,
      "Admin description",
      0,
      true,
    );
    const adminSession = await createSession(db, adminUser);

    const ctx = testing.createMockContext({
      path: `/api/user/profile/${user.username}`,
      method: "PATCH",
      body: ReadableStream.from([
        JSON.stringify({
          pic_id: 7,
          description: "Description updated by admin",
        }),
      ]),
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${adminSession.token}`],
      ],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 200);
    assertEquals(ctx.response.body, {
      message: "Profile updated successfully",
    });

    // Verify the changes were applied in the database
    const updatedUser = db
      .sql`SELECT pic_id, description FROM Users WHERE username = ${user.username};`;

    assertEquals(updatedUser, [{
      pic_id: 7,
      description: "Description updated by admin",
    }]);
  },
});

Deno.test({
  name: "Update User Profile - Unauthorized Access",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Create two users
    const user1 = await createUser(
      db,
      "user1",
      undefined,
      "User1 description",
      2,
    );
    const user2 = await createUser(
      db,
      "user2",
      undefined,
      "User2 description",
      4,
    );
    const session2 = await createSession(db, user2);

    const ctx = testing.createMockContext({
      path: `/api/user/profile/${user1.username}`,
      method: "PATCH",
      body: ReadableStream.from([
        JSON.stringify({
          pic_id: 6,
        }),
      ]),
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${session2.token}`],
      ],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 403);
    assertEquals(ctx.response.body, { error: UNAUTHORIZED });
  },
});

Deno.test({
  name: "Update User Profile - No Session",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const user = await createUser(db, "testuser");

    const ctx = testing.createMockContext({
      path: `/api/user/profile/${user.username}`,
      method: "PATCH",
      body: ReadableStream.from([
        JSON.stringify({
          pic_id: 5,
        }),
      ]),
      headers: [
        ["Content-Type", "application/json"],
      ],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 401);
    assertEquals(ctx.response.body, { error: "NO_SESSION_TOKEN" });
  },
});

Deno.test({
  name: "Update User Profile - Invalid Pic ID",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Create user and session
    const user = await createUser(
      db,
      "testuser",
      undefined,
      "Old description",
      1,
    );
    const session = await createSession(db, user);

    const ctx = testing.createMockContext({
      path: `/api/user/profile/${user.username}`,
      method: "PATCH",
      body: ReadableStream.from([
        JSON.stringify({
          pic_id: 10, // Invalid pic_id, should be between 0-7
        }),
      ]),
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${session.token}`],
      ],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 400);
    assertEquals(ctx.response.body, { error: "INVALID_PIC_ID" });
  },
});

Deno.test({
  name: "Update User Profile - Invalid Description Length",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Create user and session
    const user = await createUser(
      db,
      "testuser",
      undefined,
      "Old description",
      1,
    );
    const session = await createSession(db, user);

    // Create a description that is too long (more than 250 characters)
    const longDescription = "a".repeat(300);

    const ctx = testing.createMockContext({
      path: `/api/user/profile/${user.username}`,
      method: "PATCH",
      body: ReadableStream.from([
        JSON.stringify({
          description: longDescription,
        }),
      ]),
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${session.token}`],
      ],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 400);
    assertEquals(ctx.response.body, { error: "INVALID_DESCRIPTION" });
  },
});

Deno.test({
  name: "Update User Profile - Partial Update (Pic ID Only)",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Create user and session
    const user = await createUser(
      db,
      "testuser",
      undefined,
      "Old description",
      1,
    );
    const session = await createSession(db, user);

    const ctx = testing.createMockContext({
      path: `/api/user/profile/${user.username}`,
      method: "PATCH",
      body: ReadableStream.from([
        JSON.stringify({
          pic_id: 4,
        }),
      ]),
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${session.token}`],
      ],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 200);
    assertEquals(ctx.response.body, {
      message: "Profile updated successfully",
    });

    // Verify only pic_id was updated
    const updatedUser = db
      .sql`SELECT pic_id, description FROM Users WHERE username = ${user.username};`;

    assertEquals(updatedUser, [{
      pic_id: 4,
      description: "Old description",
    }]);
  },
});

Deno.test({
  name: "Update User Profile - Partial Update (Description Only)",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Create user and session
    const user = await createUser(
      db,
      "testuser",
      undefined,
      "Old description",
      2,
    );
    const session = await createSession(db, user);

    const ctx = testing.createMockContext({
      path: `/api/user/profile/${user.username}`,
      method: "PATCH",
      body: ReadableStream.from([
        JSON.stringify({
          description: "New description",
        }),
      ]),
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${session.token}`],
      ],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 200);
    assertEquals(ctx.response.body, {
      message: "Profile updated successfully",
    });

    // Verify only description was updated
    const updatedUser = db
      .sql`SELECT pic_id, description FROM Users WHERE username = ${user.username};`;

    assertEquals(updatedUser, [{
      pic_id: 2,
      description: "New description",
    }]);
  },
});

Deno.test({
  name: "Get Current User Info (Me) - Success",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Create user
    const user = await createUser(
      db,
      "testuser",
      undefined,
      "Test description",
      3,
    );
    const session = await createSession(db, user);

    const ctx = testing.createMockContext({
      path: `/api/user/profile/me`,
      method: "GET",
      headers: [
        ["Cookie", `SESSION=${session.token}`],
      ],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 200);
    assertEquals(ctx.response.body, {
      username: user.username,
      is_admin: user.is_admin,
    });
  },
});

Deno.test({
  name: "Get Current User Info (Me) - Admin User",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Create admin user
    const adminUser = await createUser(
      db,
      "adminuser",
      undefined,
      "Admin description",
      3,
      true, // isAdmin = true
    );
    const session = await createSession(db, adminUser);

    const ctx = testing.createMockContext({
      path: `/api/user/profile/me`,
      method: "GET",
      headers: [
        ["Cookie", `SESSION=${session.token}`],
      ],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 200);
    assertEquals(ctx.response.body, {
      username: adminUser.username,
      is_admin: adminUser.is_admin,
    });
  },
});

Deno.test({
  name: "Get Current User Info (Me) - No Session",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const ctx = testing.createMockContext({
      path: `/api/user/profile/me`,
      method: "GET",
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 401);
    assertEquals(ctx.response.body, { error: "NO_SESSION_TOKEN" });
  },
});

Deno.test({
  name: "Get Current User Info (Me) - Invalid Session",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const ctx = testing.createMockContext({
      path: `/api/user/profile/me`,
      method: "GET",
      headers: [
        ["Cookie", "SESSION=invalid_session_token"],
      ],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 401);
    assertEquals(ctx.response.body, { error: "Invalid session" });
  },
});
