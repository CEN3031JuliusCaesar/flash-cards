import { Database } from "@db/sqlite";

let db: Database;

export function persistentDB() {
  if (!db) db = new Database("./database.sqlite");

  return db;
}

export function memDB() {
  const out = new Database(":memory:", {
    memory: true,
  });

  return out;
}

export function initializeDB(db: Database) {
  db.sql`PRAGMA foreign_keys = ON;`;

  db.sql`
    CREATE TABLE IF NOT EXISTS Users (
      username varchar(32) PRIMARY KEY,
      email varchar(320) NOT NULL,
      hash char(32) NOT NULL,
      salt char(20) NOT NULL,
      pic_id tinyint DEFAULT 0,
      description varchar(250),
      streak integer DEFAULT 0,
      streak_expire integer
    );
  `;

  db.sql`
    CREATE TABLE IF NOT EXISTS Sets (
      id char(16) PRIMARY KEY,
      owner varchar(32) REFERENCES Users(username) ON DELETE CASCADE ON UPDATE CASCADE,
      title varchar(50) NOT NULL
    );
  `;

  db.sql`
    CREATE TABLE IF NOT EXISTS Cards (
      id char(16) PRIMARY KEY,
      set_id char(16) REFERENCES Sets(id) ON DELETE CASCADE,
      front varchar(1000) NOT NULL,
      back varchar(1000) NOT NULL
    );
  `;

  db.sql`
    CREATE TABLE IF NOT EXISTS CardProgress (
      username varchar(32) REFERENCES Users(username) ON DELETE CASCADE,
      card_id char(16) REFERENCES Cards(id) ON DELETE CASCADE,
      points smallint DEFAULT 0,
      last_reviewed integer,
      PRIMARY KEY (username, card_id)
    );
  `;

  db.sql`
    CREATE TABLE IF NOT EXISTS Sessions (
      token char(32) PRIMARY KEY,
      username varchar(32) REFERENCES Users(username) ON DELETE CASCADE ON UPDATE CASCADE,
      expires integer
    );
  `;

  db.sql`
    CREATE TABLE IF NOT EXISTS CanEdit (
      username varchar(32) REFERENCES Users(username) ON DELETE CASCADE ON UPDATE CASCADE,
      set_id char(16) REFERENCES Sets(id) ON DELETE CASCADE,
      PRIMARY KEY (username, set_id)
    );
  `;
}

// TODO: Implement Mock Data Initializer.
