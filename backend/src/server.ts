import { Application, send } from "@oak/oak";
import { createAPIRouter } from "./routes/combined.ts";
import { initializeDB, persistentDB } from "./db.ts";

const db = persistentDB();
await initializeDB(db);

const app = new Application();
const PORT = Deno.env.get("PORT") || 8000;

const router = createAPIRouter(db);

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
