import { NO_SESSION_TOKEN } from "../routes/constants.ts";
import { Database } from "@db/sqlite";
import { UsersUsernameView } from "../types/database.ts";

export const generateSessionToken = () => {
  const CHARACTERS =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = Date.now().toString(16) + "-";
  while (token.length < 32) {
    token += CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERS.length));
  }
  return token;
};

export async function getSession(
  ctx: {
    cookies: { get: (name: string) => Promise<string | undefined> };
    response: { body: unknown; status: number };
  },
  db: Database,
): Promise<string | undefined> {
  const sessionToken = await ctx.cookies.get("SESSION");
  if (sessionToken == null) {
    ctx.response.body = {
      error: NO_SESSION_TOKEN,
    };
    ctx.response.status = 401; // Unauthorized
    return;
  }

  const usernameResult = db.sql<UsersUsernameView>`
  SELECT s.username
  FROM Sessions s
  WHERE s.token = ${sessionToken}
    AND s.expires > strftime('%s', 'now');
`;

  if (!usernameResult || usernameResult.length === 0) {
    ctx.response.body = { error: "Invalid session" };
    ctx.response.status = 401;
    return;
  }

  return usernameResult[0].username;
}
