ALTER TABLE Users ADD COLUMN streak_start_date INTEGER;
ALTER TABLE Users ADD COLUMN streak_last_updated INTEGER;

UPDATE Users SET
    streak_start_date = CASE
        WHEN streak > 0 AND streak_expire IS NOT NULL
        THEN streak_expire - (streak * 86400) -- rough conversion from streak count to start date
        ELSE NULL
    END,
    streak_last_updated = streak_expire;
