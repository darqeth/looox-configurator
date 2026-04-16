-- Voeg is_international kolom toe aan profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_international boolean NOT NULL DEFAULT false;
