-- Cards FTS
CREATE VIRTUAL TABLE CardsFTS USING fts5(
  front,
  back,
  content = 'Cards',
  content_rowid = 'rowid_int',
  tokenize = 'porter unicode61 remove_diacritics 1'
);

INSERT INTO CardsFTS(rowid, front, back)
SELECT rowid_int, front, back FROM Cards;

INSERT INTO CardsFTS(CardsFTS) VALUES('rebuild');

CREATE TRIGGER Cards_ai_fts AFTER INSERT ON Cards
BEGIN
  INSERT INTO CardsFTS(rowid, front, back) VALUES (NEW.rowid_int, NEW.front, NEW.back);
END;

CREATE TRIGGER Cards_au_fts AFTER UPDATE OF front, back ON Cards
BEGIN
  INSERT INTO CardsFTS(CardsFTS, rowid, front, back)
  VALUES('delete', OLD.rowid_int, OLD.front, OLD.back);

  INSERT INTO CardsFTS(rowid, front, back)
  VALUES(NEW.rowid_int, NEW.front, NEW.back);
END;

CREATE TRIGGER Cards_ad_fts AFTER DELETE ON Cards
BEGIN
  INSERT INTO CardsFTS(CardsFTS, rowid, front, back)
  VALUES('delete', OLD.rowid_int, OLD.front, OLD.back);
END;

-- Sets FTS
CREATE VIRTUAL TABLE SetsFTS USING fts5(
  title,
  content = 'Sets',
  content_rowid = 'rowid_int',
  tokenize = 'porter unicode61 remove_diacritics 1'
);

INSERT INTO SetsFTS(rowid, title)
SELECT rowid_int, title FROM Sets;

INSERT INTO SetsFTS(SetsFTS) VALUES('rebuild');

CREATE TRIGGER Sets_ai_fts AFTER INSERT ON Sets
BEGIN
  INSERT INTO SetsFTS(rowid, title) VALUES (NEW.rowid_int, NEW.title);
END;

CREATE TRIGGER Sets_au_fts AFTER UPDATE OF title ON Sets
BEGIN
  INSERT INTO SetsFTS(SetsFTS, rowid, title)
  VALUES('delete', OLD.rowid_int, OLD.title);

  INSERT INTO SetsFTS(rowid, title)
  VALUES(NEW.rowid_int, NEW.title);
END;

CREATE TRIGGER Sets_ad_fts AFTER DELETE ON Sets
BEGIN
  INSERT INTO SetsFTS(SetsFTS, rowid, title)
  VALUES('delete', OLD.rowid_int, OLD.title);
END;
