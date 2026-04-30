-- Voeg total_days kolom toe aan login_streaks
-- Telt unieke dagen dat een gebruiker de app heeft gebruikt (max 1x per dag)
ALTER TABLE login_streaks ADD COLUMN IF NOT EXISTS total_days integer NOT NULL DEFAULT 0;

-- Admin en sub-admin mogen alle streaks lezen (voor gebruikersoverzicht)
CREATE POLICY "Admin ziet alle login streaks"
  ON login_streaks FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR is_sub_admin = true)));
