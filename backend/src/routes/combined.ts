import { Database } from "@db/sqlite";
import { createCardRouter } from "./cards.ts";
import { Router } from "@oak/oak";
import { createUserAPIRouter } from "./user/combined.ts";

export function createAPIRouter(db: Database) {
  const router = new Router();

  const cardsRouter = createCardRouter(db);
  router.use("/api/cards", cardsRouter.routes(), cardsRouter.allowedMethods());

  const userRouter = createUserAPIRouter(db);
  router.use("/api/user", userRouter.routes(), userRouter.allowedMethods());

  return router;
}
