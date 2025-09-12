import { Application, Router, send } from "jsr:@oak/oak";
import { db } from "./db.ts";

const app = new Application();
const router = new Router();
const PORT = Deno.env.get("PORT") || 8000;

router.get("/api/test", (ctx) => {
  const out = db.sql`SELECT sqlite_version()`;
  ctx.response.body = { out, time: Date.now() };
});
// .post("/api/todos", async (ctx) => {
//   const body = await ctx.request.body.json();
//   const { text } = body;

//   const out = db.exec("SELECT sqlite_version()");

//   ctx.response.status = 201;
//   ctx.response.body = { text, out };
// });

app.use(router.routes());
app.use(router.allowedMethods());

app.use(async (ctx, _next) => {
  const PUBLIC_DIR = "./public";
  const filePath = ctx.request.url.pathname;

  // Try to serve static file
  if (filePath !== "/") {
    const success = await send(ctx, filePath, {
      root: PUBLIC_DIR,
      index: "index.html",
    });
    if (success) return; // served static file
  }

  // await send(ctx, "/index.html", { root: PUBLIC_DIR });
});

console.log(`🚀 Server starting at http://localhost:${PORT}`);
await app.listen({ port: Number(PORT) });
