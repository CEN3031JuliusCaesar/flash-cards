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

CREATE TABLE IF NOT EXISTS Sets (
  id char(16) PRIMARY KEY,
  rowid_int INTEGER NOT NULL,
  owner varchar(32) REFERENCES Users(username) ON DELETE CASCADE ON UPDATE CASCADE,
  title varchar(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS Cards (
  id char(16) PRIMARY KEY,
  rowid_int INTEGER NOT NULL,
  set_id char(16) REFERENCES Sets(id) ON DELETE CASCADE,
  front varchar(1000) NOT NULL,
  back varchar(1000) NOT NULL
);

CREATE TABLE IF NOT EXISTS CardProgress (
  username varchar(32) REFERENCES Users(username) ON DELETE CASCADE,
  card_id char(16) REFERENCES Cards(id) ON DELETE CASCADE,
  points smallint DEFAULT 0,
  last_reviewed integer,
  PRIMARY KEY (username, card_id)
);

CREATE TABLE IF NOT EXISTS Sessions (
  token char(32) PRIMARY KEY,
  username varchar(32) REFERENCES Users(username) ON DELETE CASCADE ON UPDATE CASCADE,
  expires integer
);
