-- Add the is_admin column to the Users table if it doesn't exist
ALTER TABLE Users ADD COLUMN is_admin BOOLEAN DEFAULT 0;
