-- RLS policies voor milestones systeem
-- Run dit los als je de tabellen al hebt aangemaakt

ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_streaks ENABLE ROW LEVEL SECURITY;

-- Milestones
DROP POLICY IF EXISTS "Milestones leesbaar voor ingelogde gebruikers" ON milestones;
DROP POLICY IF EXISTS "Alleen admins mogen milestones beheren" ON milestones;

CREATE POLICY "Milestones leesbaar voor ingelogde gebruikers"
  ON milestones FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Alleen admins mogen milestones beheren"
  ON milestones FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- User_milestones
DROP POLICY IF EXISTS "Gebruiker ziet eigen milestone voortgang" ON user_milestones;
DROP POLICY IF EXISTS "Systeem mag user_milestones aanmaken" ON user_milestones;
DROP POLICY IF EXISTS "Gebruiker mag eigen user_milestone updaten (claimen)" ON user_milestones;

CREATE POLICY "Gebruiker ziet eigen milestone voortgang"
  ON user_milestones FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Systeem mag user_milestones aanmaken"
  ON user_milestones FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Gebruiker mag eigen user_milestone updaten (claimen)"
  ON user_milestones FOR UPDATE
  USING (user_id = auth.uid());

-- Discount_codes
DROP POLICY IF EXISTS "Gebruiker ziet eigen kortingscodes" ON discount_codes;
DROP POLICY IF EXISTS "Alleen admins mogen kortingscodes aanmaken" ON discount_codes;
DROP POLICY IF EXISTS "Systeem mag kortingscode als gebruikt markeren" ON discount_codes;

CREATE POLICY "Gebruiker ziet eigen kortingscodes"
  ON discount_codes FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Alleen admins mogen kortingscodes aanmaken"
  ON discount_codes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Systeem mag kortingscode als gebruikt markeren"
  ON discount_codes FOR UPDATE
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Login_streaks
DROP POLICY IF EXISTS "Gebruiker ziet eigen streak" ON login_streaks;
DROP POLICY IF EXISTS "Gebruiker mag eigen streak upserten" ON login_streaks;

CREATE POLICY "Gebruiker ziet eigen streak"
  ON login_streaks FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Gebruiker mag eigen streak upserten"
  ON login_streaks FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
