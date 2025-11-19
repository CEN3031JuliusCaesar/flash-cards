-- drop triggers first
DROP TRIGGER IF EXISTS Cards_ai_fts;
DROP TRIGGER IF EXISTS Cards_au_fts;
DROP TRIGGER IF EXISTS Cards_ad_fts;

DROP TRIGGER IF EXISTS Sets_ai_fts;
DROP TRIGGER IF EXISTS Sets_au_fts;
DROP TRIGGER IF EXISTS Sets_ad_fts;

-- drop FTS tables
DROP TABLE CardsFTS;
DROP TABLE SetsFTS;
