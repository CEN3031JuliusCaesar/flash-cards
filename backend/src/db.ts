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

import { loadDevFixturesData } from "./fixtures/dev-fixtures.ts";

/**
 * Loads development fixtures data into the database using TypeScript functions
 */
export async function loadDevFixtures(db: Database) {
  try {
    console.info("Loading development fixtures...");
    await loadDevFixturesData(db);
    console.info("✅ Development fixtures loaded successfully");
  } catch (error) {
    console.error(`Error loading dev fixtures:`, error);
    throw error;
  }
}
