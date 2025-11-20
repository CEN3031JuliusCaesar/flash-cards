import { Database } from "@db/sqlite";
import { MigrationRunner } from "./utils/migrationRunner.ts";

let db: Database;

export function persistentDB() {
  if (!db) {
    db = new Database("./database.sqlite", { int64: true });
    // Set PRAGMA settings for persistent database
    db.exec("PRAGMA foreign_keys = ON;");
  }

  return db;
}

export function memDB() {
  const out = new Database(":memory:", {
    memory: true,
    int64: true,
  });
  // Set PRAGMA settings for in-memory database
  out.exec("PRAGMA foreign_keys = ON;");

  return out;
}

/**
 * Initializes the database by running pending migrations
 */
export async function initializeDB(db: Database) {
  const migrationRunner = new MigrationRunner(db);
  await migrationRunner.runMigrations();
}

/**
 * Loads development fixtures data into the database from all .sql files in the fixtures directory
 */
export async function loadDevFixtures(db: Database) {
  const fixturesDir = "./src/fixtures";
  try {
    const entries = [];
    for await (const entry of Deno.readDir(fixturesDir)) {
      if (entry.name.endsWith(".sql")) {
        entries.push(entry);
      }
    }

    // sort entries alphabetically by name
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const filePath = `${fixturesDir}/${entry.name}`;
      console.info(`Loading fixture: ${entry.name}`);

      const sqlContent = await Deno.readTextFile(filePath);

      db.exec(sqlContent);
    }
  } catch (error) {
    console.error(`Error loading dev fixtures`);
    throw error;
  }
}
