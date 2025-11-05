import { Database } from "@db/sqlite";
import { MigrationRunner } from "./utils/migrationRunner.ts";

let db: Database;

export function persistentDB() {
  if (!db) {
    db = new Database("./database.sqlite");
    // Set PRAGMA settings for persistent database
    db.exec("PRAGMA foreign_keys = ON;");
  }

  return db;
}

export function memDB() {
  const out = new Database(":memory:", {
    memory: true,
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

// TODO: Implement Mock Data Initializer.
