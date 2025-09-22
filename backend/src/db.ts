import { Database } from "jsr:@db/sqlite";

const db = new Database("./database.sqlite");

console.log("✅ SQLite DB initialized");

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
    streak_expire integer DEFAULT current_timestamp
  );
`


console.log("✅ Users table ensured");

db.sql`
  CREATE TABLE IF NOT EXISTS CanEdit (
    username varchar(32) REFERENCES Users(username) ON DELETE CASCADE ON UPDATE CASCADE,
    set_id integer REFERENCES Sets(id) ON DELETE CASCADE,
    PRIMARY KEY (username, set_id)
  );
`

console.log("✅ CanEdit table ensured");

db.sql`
  CREATE TABLE IF NOT EXISTS Sets (
    id integer PRIMARY KEY AUTOINCREMENT,
    owner varchar(32) REFERENCES Users(username) ON DELETE CASCADE ON UPDATE CASCADE,
    title varchar(50) NOT NULL
  );
`

console.log("✅ Sets table ensured");

db.sql`
  CREATE TABLE IF NOT EXISTS Cards (
    set_id integer REFERENCES Sets(id) ON DELETE CASCADE,
    id smallint,
    front varchar(1000) NOT NULL,
    back varchar(1000) NOT NULL,
    PRIMARY KEY (set_id, id)
  );
`

console.log("✅ Cards table ensured");

db.sql`
  CREATE TABLE IF NOT EXISTS CardProgress (
    username varchar(32) REFERENCES Users(username) ON DELETE CASCADE,
    set_id integer REFERENCES Cards(set_id) ON DELETE CASCADE,
    card_id integer REFERENCES Cards(id) ON DELETE CASCADE,
    points smallint DEFAULT 0,
    last_reviewed integer DEFAULT current_timestamp,
    PRIMARY KEY (username, set_id, card_id)
  );
`

console.log("✅ CardProgress table ensured");

db.sql`
  CREATE TABLE IF NOT EXISTS Sessions (
    token char(32) PRIMARY KEY,
    username varchar(32) REFERENCES Users(username) ON DELETE CASCADE ON UPDATE CASCADE,
    expires integer DEFAULT (current_timestamp+60*60*24)
  );
`

console.log("✅ Sessions table ensured");

export { db };
