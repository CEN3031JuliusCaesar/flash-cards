import type { Database } from "@db/sqlite";
import { createCardRouter } from "./cards.ts";
import { createSetsRouter } from "./sets.ts";
import { Router } from "@oak/oak";
import { createUserAPIRouter } from "./user/combined.ts";

// Main API router combining all route modules
export function createAPIRouter(db: Database) {
  const router = new Router();

  // Card endpoints: /api/cards
  const cardsRouter = createCardRouter(db);
  router.use("/api/cards", cardsRouter.routes(), cardsRouter.allowedMethods());

  // Sets endpoints: /api/sets
  const setsRouter = createSetsRouter(db);
  router.use("/api/sets", setsRouter.routes(), setsRouter.allowedMethods());

  // User endpoints: /api/user
  const userRouter = createUserAPIRouter(db);
  router.use("/api/user", userRouter.routes(), userRouter.allowedMethods());

  return router;
}
