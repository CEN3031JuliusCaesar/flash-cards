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
      pic_id: user.profile_picture,
      description: user.description,
      is_admin: user.is_admin,
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

Deno.test({
  name: "Delete User Account - By Owner",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Create user
    const user = await createUser(
      db,
      "testuser",
      "test@example.com",
      "Test description",
      3,
    );
    const session = await createSession(db, user);

    const ctx = testing.createMockContext({
      path: `/api/user/profile/${user.username}`,
      method: "DELETE",
      headers: [
        ["Cookie", `SESSION=${session.token}`],
      ],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 200);
    assertEquals(ctx.response.body, {
      message: "Account deleted successfully",
    });

    // Verify the user was deleted from the database
    const deletedUser = db
      .sql`SELECT username FROM Users WHERE username = ${user.username};`;

    assertEquals(deletedUser.length, 0);
  },
});

Deno.test({
  name: "Delete User Account - By Admin",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Create regular user and admin user
    const user = await createUser(
      db,
      "testuser",
      "test@example.com",
      "Test description",
      1,
    );
    const adminUser = await createUser(
      db,
      "adminuser",
      "admin@example.com",
      "Admin description",
      0,
      true,
    );
    const adminSession = await createSession(db, adminUser);

    const ctx = testing.createMockContext({
      path: `/api/user/profile/${user.username}`,
      method: "DELETE",
      headers: [
        ["Cookie", `SESSION=${adminSession.token}`],
      ],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 200);
    assertEquals(ctx.response.body, {
      message: "Account deleted successfully",
    });

    // Verify the user was deleted from the database
    const deletedUser = db
      .sql`SELECT username FROM Users WHERE username = ${user.username};`;

    assertEquals(deletedUser.length, 0);
  },
});

Deno.test({
  name: "Delete User Account - Unauthorized Access",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Create two users
    const user1 = await createUser(
      db,
      "user1",
      "user1@example.com",
      "User1 description",
      2,
    );
    const user2 = await createUser(
      db,
      "user2",
      "user2@example.com",
      "User2 description",
      4,
    );
    const session2 = await createSession(db, user2);

    const ctx = testing.createMockContext({
      path: `/api/user/profile/${user1.username}`,
      method: "DELETE",
      headers: [
        ["Cookie", `SESSION=${session2.token}`],
      ],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 403);
    assertEquals(ctx.response.body, { error: UNAUTHORIZED });

    // Verify the user was NOT deleted from the database
    const userStillExists = db
      .sql`SELECT username FROM Users WHERE username = ${user1.username};`;

    assertEquals(userStillExists.length, 1);
  },
});

Deno.test({
  name: "Delete User Account - Admin Cannot Delete Last Admin",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Create admin user (only admin)
    const adminUser = await createUser(
      db,
      "adminuser",
      "admin@example.com",
      "Admin description",
      0,
      true,
    );
    const session = await createSession(db, adminUser);

    const ctx = testing.createMockContext({
      path: `/api/user/profile/${adminUser.username}`,
      method: "DELETE",
      headers: [
        ["Cookie", `SESSION=${session.token}`],
      ],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 400);
    assertEquals(ctx.response.body, { error: "CANNOT_DELETE_LAST_ADMIN" });

    // Verify the admin user was NOT deleted from the database
    const adminStillExists = db
      .sql`SELECT username, is_admin FROM Users WHERE username = ${adminUser.username};`;

    assertEquals(adminStillExists.length, 1);
    assertEquals(adminStillExists[0].is_admin, 1);
  },
});

Deno.test({
  name: "Delete User Account - Target User Not Found",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Create a user
    const user = await createUser(
      db,
      "testuser",
      "test@example.com",
      "Test description",
      0,
    );
    const session = await createSession(db, user);

    const ctx = testing.createMockContext({
      path: `/api/user/profile/nonexistentuser`,
      method: "DELETE",
      headers: [
        ["Cookie", `SESSION=${session.token}`],
      ],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 404);
    assertEquals(ctx.response.body, { error: "USER_NOT_FOUND" });
  },
});

Deno.test({
  name: "Delete User Account - No Session",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const ctx = testing.createMockContext({
      path: `/api/user/profile/testuser`,
      method: "DELETE",
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 401);
    assertEquals(ctx.response.body, { error: "NO_SESSION_TOKEN" });
  },
});

Deno.test({
  name: "Delete User Account - User Data Cascade Delete",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Create user with related data
    const user = await createUser(
      db,
      "testuser",
      "test@example.com",
      "Test description",
      3,
    );
    const session = await createSession(db, user);

    // Create a set for the user
    const setId = crypto.randomUUID().replace(/-/g, "").substring(0, 16);
    db.sql`INSERT INTO Sets (id, rowid_int, owner, title) VALUES (${setId}, 1, ${user.username}, 'Test Set');`;

    // Create a card for the set
    const cardId = crypto.randomUUID().replace(/-/g, "").substring(0, 16);
    db.sql`INSERT INTO Cards (id, rowid_int, set_id, front, back) VALUES (${cardId}, 1, ${setId}, 'Front', 'Back');`;

    // Create card progress for the user
    db.sql`INSERT INTO CardProgress (username, card_id, points) VALUES (${user.username}, ${cardId}, 5);`;

    // Create tracked set for the user
    db.sql`INSERT INTO TrackedSets (username, set_id) VALUES (${user.username}, ${setId});`;

    // Verify data exists before deletion
    const userDataBefore = db
      .sql`SELECT username FROM Users WHERE username = ${user.username};`;
    const sessionsBefore = db
      .sql`SELECT token FROM Sessions WHERE username = ${user.username};`;
    const cardProgressBefore = db
      .sql`SELECT card_id FROM CardProgress WHERE username = ${user.username};`;
    const trackedSetsBefore = db
      .sql`SELECT set_id FROM TrackedSets WHERE username = ${user.username};`;
    const setsBefore = db
      .sql`SELECT id FROM Sets WHERE owner = ${user.username};`;
    const cardsBefore = db
      .sql`SELECT id FROM Cards WHERE set_id = ${setId};`;

    assertEquals(userDataBefore.length, 1);
    assertEquals(sessionsBefore.length, 1);
    assertEquals(cardProgressBefore.length, 1);
    assertEquals(trackedSetsBefore.length, 1);
    assertEquals(setsBefore.length, 1);
    assertEquals(cardsBefore.length, 1);

    // Delete the user
    const ctx = testing.createMockContext({
      path: `/api/user/profile/${user.username}`,
      method: "DELETE",
      headers: [
        ["Cookie", `SESSION=${session.token}`],
      ],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 200);
    assertEquals(ctx.response.body, {
      message: "Account deleted successfully",
    });

    // Verify all related data was deleted via cascade
    const userDataAfter = db
      .sql`SELECT username FROM Users WHERE username = ${user.username};`;
    const sessionsAfter = db
      .sql`SELECT token FROM Sessions WHERE username = ${user.username};`;
    const cardProgressAfter = db
      .sql`SELECT card_id FROM CardProgress WHERE username = ${user.username};`;
    const trackedSetsAfter = db
      .sql`SELECT set_id FROM TrackedSets WHERE username = ${user.username};`;
    const setsAfter = db
      .sql`SELECT id FROM Sets WHERE owner = ${user.username};`;
    const cardsAfter = db
      .sql`SELECT id FROM Cards WHERE set_id = ${setId};`;

    assertEquals(userDataAfter.length, 0);
    assertEquals(sessionsAfter.length, 0);
    assertEquals(cardProgressAfter.length, 0);
    assertEquals(trackedSetsAfter.length, 0);
    assertEquals(setsAfter.length, 0);
    assertEquals(cardsAfter.length, 0);
  },
});

Deno.test({
  name: "Update User Admin Status - By Admin (Promote to Admin)",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Create regular user and admin user
    const user = await createUser(
      db,
      "testuser",
      "test@example.com",
      "Test description",
      1,
      false, // is not admin
    );
    const adminUser = await createUser(
      db,
      "adminuser",
      "admin@example.com",
      "Admin description",
      0,
      true, // isAdmin = true
    );
    const adminSession = await createSession(db, adminUser);

    const ctx = testing.createMockContext({
      path: `/api/user/profile/admin/${user.username}`,
      method: "PUT",
      body: ReadableStream.from([
        JSON.stringify({
          is_admin: true,
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
      message: "User promoted to admin successfully",
    });

    // Verify the user's admin status was updated in the database
    const updatedUser = db
      .sql`SELECT username, is_admin FROM Users WHERE username = ${user.username};`;

    assertEquals(updatedUser, [{
      username: user.username,
      is_admin: 1, // true as integer
    }]);
  },
});

Deno.test({
  name: "Update User Admin Status - By Admin (Remove Admin)",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Create admin user and another admin user
    const user = await createUser(
      db,
      "adminuser",
      "admin@example.com",
      "Admin description",
      1,
      true, // is admin
    );
    const adminUser = await createUser(
      db,
      "mainadmin",
      "mainadmin@example.com",
      "Main Admin description",
      0,
      true, // isAdmin = true
    );
    const adminSession = await createSession(db, adminUser);

    const ctx = testing.createMockContext({
      path: `/api/user/profile/admin/${user.username}`,
      method: "PUT",
      body: ReadableStream.from([
        JSON.stringify({
          is_admin: false,
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
      message: "User admin status removed successfully",
    });

    // Verify the user's admin status was updated in the database
    const updatedUser = db
      .sql`SELECT username, is_admin FROM Users WHERE username = ${user.username};`;

    assertEquals(updatedUser, [{
      username: user.username,
      is_admin: 0, // false as integer
    }]);
  },
});

Deno.test({
  name: "Update User Admin Status - Unauthorized Access (Regular User)",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Create two regular users
    const user1 = await createUser(
      db,
      "user1",
      "user1@example.com",
      "User1 description",
      2,
      false,
    );
    const user2 = await createUser(
      db,
      "user2",
      "user2@example.com",
      "User2 description",
      4,
      false,
    );
    const session2 = await createSession(db, user2);

    const ctx = testing.createMockContext({
      path: `/api/user/profile/admin/${user1.username}`,
      method: "PUT",
      body: ReadableStream.from([
        JSON.stringify({
          is_admin: true,
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

    // Verify the user's admin status was NOT updated in the database
    const userStillNotAdmin = db
      .sql`SELECT username, is_admin FROM Users WHERE username = ${user1.username};`;

    assertEquals(userStillNotAdmin, [{
      username: user1.username,
      is_admin: 0, // should still be false
    }]);
  },
});

Deno.test({
  name: "Update User Admin Status - Admin Cannot Remove Last Admin",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Create only one admin user
    const adminUser = await createUser(
      db,
      "onlyadmin",
      "onlyadmin@example.com",
      "Only Admin description",
      0,
      true, // isAdmin = true
    );
    const adminSession = await createSession(db, adminUser);

    const ctx = testing.createMockContext({
      path: `/api/user/profile/admin/${adminUser.username}`,
      method: "PUT",
      body: ReadableStream.from([
        JSON.stringify({
          is_admin: false,
        }),
      ]),
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${adminSession.token}`],
      ],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 400);
    assertEquals(ctx.response.body, { error: "CANNOT_REMOVE_LAST_ADMIN" });

    // Verify the admin user's status was NOT changed
    const adminStillExists = db
      .sql`SELECT username, is_admin FROM Users WHERE username = ${adminUser.username};`;

    assertEquals(adminStillExists.length, 1);
    assertEquals(adminStillExists[0].is_admin, 1);
  },
});

Deno.test({
  name: "Update User Admin Status - Target User Not Found",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Create admin user
    const adminUser = await createUser(
      db,
      "adminuser",
      "admin@example.com",
      "Admin description",
      0,
      true, // isAdmin = true
    );
    const adminSession = await createSession(db, adminUser);

    const ctx = testing.createMockContext({
      path: `/api/user/profile/admin/nonexistentuser`,
      method: "PUT",
      body: ReadableStream.from([
        JSON.stringify({
          is_admin: true,
        }),
      ]),
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${adminSession.token}`],
      ],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 404);
    assertEquals(ctx.response.body, { error: "USER_NOT_FOUND" });
  },
});

Deno.test({
  name: "Update User Admin Status - No Session",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const ctx = testing.createMockContext({
      path: `/api/user/profile/admin/testuser`,
      method: "PUT",
      body: ReadableStream.from([
        JSON.stringify({
          is_admin: true,
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
  name: "Update User Admin Status - Invalid Request Body",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Create admin user
    const adminUser = await createUser(
      db,
      "adminuser",
      "admin@example.com",
      "Admin description",
      0,
      true, // isAdmin = true
    );
    const adminSession = await createSession(db, adminUser);

    const ctx = testing.createMockContext({
      path: `/api/user/profile/admin/testuser`,
      method: "PUT",
      body: ReadableStream.from([
        JSON.stringify({
          invalid_field: "invalid",
        }),
      ]),
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${adminSession.token}`],
      ],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 400);
    assertEquals(ctx.response.body, { error: "INVALID_REQUEST" });
  },
});

Deno.test({
  name: "Update User Admin Status - Invalid is_admin Value",
  async fn() {
    const db = memDB();
    await initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Create admin user
    const adminUser = await createUser(
      db,
      "adminuser",
      "admin@example.com",
      "Admin description",
      0,
      true, // isAdmin = true
    );
    const adminSession = await createSession(db, adminUser);

    const ctx = testing.createMockContext({
      path: `/api/user/profile/admin/testuser`,
      method: "PUT",
      body: ReadableStream.from([
        JSON.stringify({
          is_admin: "not_a_boolean", // Invalid type
        }),
      ]),
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${adminSession.token}`],
      ],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 400);
    assertEquals(ctx.response.body, { error: "INVALID_REQUEST" });
  },
});
