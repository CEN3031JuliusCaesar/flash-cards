import { Application, send } from "@oak/oak";
import { createAPIRouter } from "./routes/combined.ts";
import { initializeDB, loadDevFixtures, memDB, persistentDB } from "./db.ts";

// Check if DEV environment variable is set to true
const isDev = Deno.env.get("DEV") === "true";
const db = isDev ? memDB() : persistentDB();
await initializeDB(db);

// Load development fixtures if in development mode
if (isDev) {
  await loadDevFixtures(db);
  console.info("🚀 Development fixtures loaded into in-memory database");
}

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

console.info(`🚀 Server starting at http://localhost:${PORT}`);
await app.listen({ port: Number(PORT) });
