import { Application, Router, send } from "jsr:@oak/oak";
import { cardsRouter } from "./routes/cards.ts";
import { streakRouter } from "./routes/streak.ts";

const app = new Application();
const router = new Router();
const PORT = Deno.env.get("PORT") || 8000;

router.use("/api/cards", cardsRouter.routes(), cardsRouter.allowedMethods());
router.use(
  "/api/streaks",
  streakRouter.routes(),
  streakRouter.allowedMethods(),
);

app.use(router.routes());
app.use(router.allowedMethods());

app.use(async (ctx, _next) => {
  const PUBLIC_DIR = "./public";
  const filePath = ctx.request.url.pathname;

  if (filePath !== "/") {
    const success = await send(ctx, filePath, {
      root: PUBLIC_DIR,
      index: "index.html",
    });
    if (success) return;
  }
});

console.log(`🚀 Server starting at http://localhost:${PORT}`);
await app.listen({ port: Number(PORT) });
