import { Database } from "@db/sqlite";
import { createStreakRouter } from "./streak.ts";
import { createAuthRouter } from "./auth.ts";
import { createProfileRouter } from "./profile.ts";
import { Router } from "@oak/oak";

export function createUserAPIRouter(db: Database) {
  const router = new Router();

  const streakRouter = createStreakRouter(db);
  router.use("/streaks", streakRouter.routes(), streakRouter.allowedMethods());

  const authRouter = createAuthRouter(db);
  router.use("/auth", authRouter.routes(), authRouter.allowedMethods());

  const profileRouter = createProfileRouter(db);
  router.use(
    "/profile",
    profileRouter.routes(),
    profileRouter.allowedMethods(),
  );

  return router;
}
