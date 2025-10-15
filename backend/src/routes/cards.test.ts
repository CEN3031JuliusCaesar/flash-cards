import { testing } from "@oak/oak";
import { assertEquals } from "@std/assert";
import { initializeDB, memDB } from "../db.ts";
import { createAPIRouter } from "./combined.ts";

Deno.test({
  name: "Test that card is readable",
  async fn() {
    const db = memDB();

    initializeDB(db);

    const ctx = testing.createMockContext({
      path: "/api/cards/test",
    });
    const next = testing.createMockNext();

    const mw = createAPIRouter(db).routes();

    await mw(ctx, next);

    assertEquals(ctx.response.body, []);

    //TODO
  },
});
