import { Database } from "jsr:@db/sqlite";

const db = new Database("./database.sqlite");

console.log("✅ SQLite DB initialized");

export { db };
