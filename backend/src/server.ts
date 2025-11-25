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

// Serve API routes
app.use(router.routes());
app.use(router.allowedMethods());

// Serve static assets from /public/assets
app.use(async (ctx, next) => {
  if (ctx.request.url.pathname.startsWith("/assets/")) {
    const filePath = ctx.request.url.pathname;

    ctx.response.headers.set(
      "Cache-Control",
      "public, max-age=31536000, immutable",
    );
    const success = await send(ctx, filePath, {
      root: import.meta.dirname + "/../public",
    });
    if (success) return;
  }
  await next();
});

// Fallback to index.html for client-side routing
app.use(async (ctx, _next) => {
  const PUBLIC_DIR = import.meta.dirname + "/../public";

  // Only serve index.html for non-API routes that don't match static assets
  ctx.response.headers.set(
    "Cache-Control",
    "public, max-age=0, must-revalidate",
  );
  const success = await send(ctx, "/index.html", {
    root: PUBLIC_DIR,
  });
  if (success) return;
});

console.info(`🚀 Server starting at http://localhost:${PORT}`);
await app.listen({ port: Number(PORT) });
