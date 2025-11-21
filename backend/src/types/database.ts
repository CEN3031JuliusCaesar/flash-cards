// Database Row Types - Represent the full structure of each table

export type SchemaMigrationsRow = {
  id: number;
  migration_name: string;
  applied_at: string; // DATETIME
};

export type UsersRow = {
  username: string; // varchar(32), PK
  email: string; // varchar(320)
  hash: string; // char(32)
  salt: string; // char(20)
  pic_id: number; // tinyint
  description: string | null; // varchar(250)
  streak: number; // INTEGER
  streak_expire: number; // INTEGER
  is_admin: number; // BOOLEAN (stored as INTEGER in SQLite)
  streak_start_date: number | null; // INTEGER
  streak_last_updated: number | null; // INTEGER
};

export type SetsRow = {
  id: string; // char(16), PK
  rowid_int: number; // INTEGER
  owner: string; // varchar(32)
  title: string; // varchar(50)
};

export type CardsRow = {
  id: string; // char(16), PK
  rowid_int: number; // INTEGER
  set_id: string; // char(16)
  front: string; // varchar(1000)
  back: string; // varchar(1000)
};

export type CardProgressRow = {
  username: string; // varchar(32), PK part
  card_id: string; // char(16), PK part
  points: number; // smallint
  last_reviewed: number; // INTEGER
};

export type SessionsRow = {
  token: string; // char(32), PK
  username: string; // varchar(32)
  expires: number; // INTEGER
};

export type TrackedSetsRow = {
  username: string; // varchar(32), PK part
  set_id: string; // char(16), PK part
};

// View Types - Specific subsets of columns for common queries
// These use the pattern: Select<TableRow, "column1" | "column2" | ...>

// Users View Types
export type UsersSaltView = Pick<UsersRow, "salt">;
export type UsersUsernameView = Pick<UsersRow, "username">;
export type UsersLoginView = Pick<UsersRow, "username" | "hash" | "salt">;
export type UsersSettingsView = Pick<
  UsersRow,
  "pic_id" | "description"
>;
export type UsersProfileView = UsersSettingsView & UsersUsernameView;
export type UsersSessionView = Pick<UsersRow, "username" | "is_admin">;
export type UsersStreakView = Pick<
  UsersRow,
  "username" | "streak_start_date" | "streak_last_updated"
>;

// Sets View Types
export type SetsBasicView = Pick<SetsRow, "id" | "owner" | "title">;
export type SetsOwnerView = Pick<SetsRow, "owner">;
export type SetsIdView = Pick<SetsRow, "id">;

// Cards View Types
export type CardsBasicView = Pick<CardsRow, "id" | "set_id" | "front" | "back">;
export type CardsFrontBackOnlyView = Pick<CardsRow, "front" | "back">;

// CardProgress View Types
export type CardProgressBasicView = Pick<
  CardProgressRow,
  "username" | "card_id" | "points" | "last_reviewed"
>;

// Sessions View Types
export type SessionsBasicView = Pick<
  SessionsRow,
  "token" | "username" | "expires"
>;

// TrackedSets View Types
export type TrackedSetsBasicView = Pick<TrackedSetsRow, "username" | "set_id">;

// Results not related to a certain table
export type CardProgressWithCardInfoResult =
  & CardsBasicView
  & Pick<CardProgressRow, "points" | "last_reviewed">;
export type StreakResult = { current_streak: number };
export type TrackedStatusResult = { 1: number }; // SQLite returns 1 for SELECT 1
export type ChangesResult = { affected_rows: number };
export type Ranked = { rank: number };
export type RankedSetsResult = SetsBasicView & Ranked;
export type RankedSetsWithCardsResult = RankedSetsResult & {
  card_id: string;
  card_front: string;
  card_back: string;
};
