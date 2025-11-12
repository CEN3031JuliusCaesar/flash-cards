CREATE TABLE IF NOT EXISTS TrackedSets (
  username varchar(32) REFERENCES Users(username) ON DELETE CASCADE ON UPDATE CASCADE,
  set_id char(16) REFERENCES Sets(id) ON DELETE CASCADE,
  PRIMARY KEY (username, set_id)
);
