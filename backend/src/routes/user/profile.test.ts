import { testing } from "@oak/oak";
import { assertEquals } from "@std/assert";
import { initializeDB, memDB } from "../../db.ts";
import { createAPIRouter } from "../combined.ts";

const TEST_USERNAME = "testuser";
const TEST_EMAIL = "test@example.com";
const TEST_HASH = "hash";
const TEST_SALT = "salt";
const TEST_SESSION_TOKEN = "valid_session_token";
const TEST_ADMIN_USERNAME = "adminuser";
const TEST_ADMIN_EMAIL = "admin@example.com";
const TEST_ADMIN_HASH = "adminhash";
const TEST_ADMIN_SALT = "adminsalt";
const TEST_ADMIN_SESSION_TOKEN = "admin_session_token";

Deno.test({
  name: "Get User Profile - Success",
  async fn() {
    const db = memDB();
    initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Set up test user in the database
    db.sql`INSERT INTO Users (username, email, hash, salt, pic_id, description) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT}, ${3}, ${"Test description"})`;

    const ctx = testing.createMockContext({
      path: `/api/user/profile/${TEST_USERNAME}`,
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
    initializeDB(db);
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
    initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Set up test user and session in the database
    db.sql`INSERT INTO Users (username, email, hash, salt, pic_id, description) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT}, ${2}, ${"Old description"})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      Math.floor(Date.now() / 1000) + 3600
    })`;

    const ctx = testing.createMockContext({
      path: `/api/user/profile/${TEST_USERNAME}`,
      method: "PATCH",
      body: ReadableStream.from([
        JSON.stringify({
          pic_id: 5,
          description: "New description",
        }),
      ]),
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${TEST_SESSION_TOKEN}`],
      ],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 200);
    assertEquals(ctx.response.body, {
      message: "Profile updated successfully",
    });

    // Verify the changes were applied in the database
    const updatedUser = db
      .sql`SELECT pic_id, description FROM Users WHERE username = ${TEST_USERNAME};`;

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
    initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Set up regular user and admin user in the database
    db.sql`INSERT INTO Users (username, email, hash, salt, pic_id, description, is_admin) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT}, ${1}, ${"Old description"}, ${0})`;
    db.sql`INSERT INTO Users (username, email, hash, salt, pic_id, description, is_admin) VALUES (${TEST_ADMIN_USERNAME}, ${TEST_ADMIN_EMAIL}, ${TEST_ADMIN_HASH}, ${TEST_ADMIN_SALT}, ${0}, ${"Admin description"}, ${1})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${TEST_ADMIN_USERNAME}, ${TEST_ADMIN_SESSION_TOKEN}, ${
      Math.floor(Date.now() / 1000) + 3600
    })`;

    const ctx = testing.createMockContext({
      path: `/api/user/profile/${TEST_USERNAME}`,
      method: "PATCH",
      body: ReadableStream.from([
        JSON.stringify({
          pic_id: 7,
          description: "Description updated by admin",
        }),
      ]),
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${TEST_ADMIN_SESSION_TOKEN}`],
      ],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 200);
    assertEquals(ctx.response.body, {
      message: "Profile updated successfully",
    });

    // Verify the changes were applied in the database
    const updatedUser = db
      .sql`SELECT pic_id, description FROM Users WHERE username = ${TEST_USERNAME};`;

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
    initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Set up user1, user2, and session for user2 in the database
    db.sql`INSERT INTO Users (username, email, hash, salt, pic_id, description) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT}, ${2}, ${"User1 description"})`;
    db.sql`INSERT INTO Users (username, email, hash, salt, pic_id, description) VALUES (${"anotheruser"}, ${"another@example.com"}, ${"anotherhash"}, ${"anothersalt"}, ${4}, ${"User2 description"})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${"anotheruser"}, ${TEST_SESSION_TOKEN}, ${
      Math.floor(Date.now() / 1000) + 3600
    })`;

    const ctx = testing.createMockContext({
      path: `/api/user/profile/${TEST_USERNAME}`,
      method: "PATCH",
      body: ReadableStream.from([
        JSON.stringify({
          pic_id: 6,
        }),
      ]),
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${TEST_SESSION_TOKEN}`],
      ],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 403);
    assertEquals(ctx.response.body, { error: "UNAUTHORIZED" });
  },
});

Deno.test({
  name: "Update User Profile - No Session",
  async fn() {
    const db = memDB();
    initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    const ctx = testing.createMockContext({
      path: `/api/user/profile/${TEST_USERNAME}`,
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
    initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Set up test user and session in the database
    db.sql`INSERT INTO Users (username, email, hash, salt, pic_id, description) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT}, ${1}, ${"Old description"})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      Math.floor(Date.now() / 1000) + 3600
    })`;

    const ctx = testing.createMockContext({
      path: `/api/user/profile/${TEST_USERNAME}`,
      method: "PATCH",
      body: ReadableStream.from([
        JSON.stringify({
          pic_id: 10, // Invalid pic_id, should be between 0-7
        }),
      ]),
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${TEST_SESSION_TOKEN}`],
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
    initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Set up test user and session in the database
    db.sql`INSERT INTO Users (username, email, hash, salt, pic_id, description) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT}, ${1}, ${"Old description"})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      Math.floor(Date.now() / 1000) + 3600
    })`;

    // Create a description that is too long (more than 250 characters)
    const longDescription = "a".repeat(300);

    const ctx = testing.createMockContext({
      path: `/api/user/profile/${TEST_USERNAME}`,
      method: "PATCH",
      body: ReadableStream.from([
        JSON.stringify({
          description: longDescription,
        }),
      ]),
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${TEST_SESSION_TOKEN}`],
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
    initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Set up test user and session in the database
    db.sql`INSERT INTO Users (username, email, hash, salt, pic_id, description) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT}, ${1}, ${"Old description"})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      Math.floor(Date.now() / 1000) + 3600
    })`;

    const ctx = testing.createMockContext({
      path: `/api/user/profile/${TEST_USERNAME}`,
      method: "PATCH",
      body: ReadableStream.from([
        JSON.stringify({
          pic_id: 4,
        }),
      ]),
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${TEST_SESSION_TOKEN}`],
      ],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 200);
    assertEquals(ctx.response.body, {
      message: "Profile updated successfully",
    });

    // Verify only pic_id was updated
    const updatedUser = db
      .sql`SELECT pic_id, description FROM Users WHERE username = ${TEST_USERNAME};`;

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
    initializeDB(db);
    const next = testing.createMockNext();
    const mw = createAPIRouter(db).routes();

    // Set up test user and session in the database
    db.sql`INSERT INTO Users (username, email, hash, salt, pic_id, description) VALUES (${TEST_USERNAME}, ${TEST_EMAIL}, ${TEST_HASH}, ${TEST_SALT}, ${2}, ${"Old description"})`;
    db.sql`INSERT INTO Sessions (username, token, expires) VALUES (${TEST_USERNAME}, ${TEST_SESSION_TOKEN}, ${
      Math.floor(Date.now() / 1000) + 3600
    })`;

    const ctx = testing.createMockContext({
      path: `/api/user/profile/${TEST_USERNAME}`,
      method: "PATCH",
      body: ReadableStream.from([
        JSON.stringify({
          description: "New description",
        }),
      ]),
      headers: [
        ["Content-Type", "application/json"],
        ["Cookie", `SESSION=${TEST_SESSION_TOKEN}`],
      ],
    });

    await mw(ctx, next);

    assertEquals(ctx.response.status, 200);
    assertEquals(ctx.response.body, {
      message: "Profile updated successfully",
    });

    // Verify only description was updated
    const updatedUser = db
      .sql`SELECT pic_id, description FROM Users WHERE username = ${TEST_USERNAME};`;

    assertEquals(updatedUser, [{
      pic_id: 2,
      description: "New description",
    }]);
  },
});
