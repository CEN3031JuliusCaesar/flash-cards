import { Database } from "@db/sqlite";
import { createCardRouter } from "./cards.ts";
import { createStreakRouter } from "./streak.ts";
import { createAuthRouter } from "./auth.ts";
import { Router } from "@oak/oak";

export function createAPIRouter(db: Database) {
  const router = new Router();

  const cardsRouter = createCardRouter(db);
  router.use("/api/cards", cardsRouter.routes(), cardsRouter.allowedMethods());

  const streakRouter = createStreakRouter(db);
  router.use(
    "/api/streaks",
    streakRouter.routes(),
    streakRouter.allowedMethods(),
  );

  const authRouter = createAuthRouter(db);
  router.use("/api/auth", authRouter.routes(), authRouter.allowedMethods());

  return router;
}
