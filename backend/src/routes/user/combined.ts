import { Database } from "@db/sqlite";
import { createStreakRouter } from "./streak.ts";
import { createAuthRouter } from "./auth.ts";
import { Router } from "@oak/oak";

// API router for user-related endpoints including authentication and streak management
export function createUserAPIRouter(db: Database) {
  const router = new Router();

  // Streak endpoints: /api/user/streaks
  const streakRouter = createStreakRouter(db);
  router.use("/streaks", streakRouter.routes(), streakRouter.allowedMethods());

  // Authentication endpoints: /api/user/auth
  const authRouter = createAuthRouter(db);
  router.use("/auth", authRouter.routes(), authRouter.allowedMethods());

  return router;
}
