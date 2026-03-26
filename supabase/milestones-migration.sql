-- Milestones & Kortingscodes systeem
-- Run eenmalig in Supabase SQL Editor

-- ─── 1. MILESTONES ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS milestones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  -- Doel
  goal_type       TEXT NOT NULL CHECK (goal_type IN ('configs', 'orders', 'order_revenue', 'shape', 'streak')),
  goal_value      NUMERIC(10, 2) NOT NULL DEFAULT 1,   -- aantal / bedrag / dagen
  goal_shape      TEXT,                                 -- alleen voor goal_type = 'shape'
  -- Voordeel
  benefit_type    TEXT NOT NULL CHECK (benefit_type IN ('discount_pct', 'discount_fixed', 'custom')),
  benefit_value   NUMERIC(10, 2),                       -- % of € korting
  benefit_description TEXT,                             -- tekst voor custom voordeel
  -- Beheer
  is_active       BOOLEAN NOT NULL DEFAULT true,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 2. USER_MILESTONES ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_milestones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  milestone_id    UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  achieved_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Voor kortingsvoordelen: auto-gegenereerde unieke code
  discount_code   TEXT UNIQUE,
  -- Voor custom voordelen: gegenereerd bij claimen
  voucher_code    TEXT UNIQUE,
  claimed_at      TIMESTAMPTZ,
  UNIQUE (user_id, milestone_id)
);

-- ─── 3. DISCOUNT_CODES ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS discount_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  type            TEXT NOT NULL CHECK (type IN ('pct', 'fixed')),
  value           NUMERIC(10, 2) NOT NULL,
  -- Optioneel: gekoppeld aan gebruiker en/of milestone
  user_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  milestone_id    UUID REFERENCES milestones(id) ON DELETE SET NULL,
  -- Gebruik
  used_at         TIMESTAMPTZ,
  used_on_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 4. LOGIN_STREAKS ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS login_streaks (
  user_id         UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak  INTEGER NOT NULL DEFAULT 0,
  longest_streak  INTEGER NOT NULL DEFAULT 0,
  last_login_date DATE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 5. RLS POLICIES ────────────────────────────────────────────────────────

ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_streaks ENABLE ROW LEVEL SECURITY;

-- Milestones: iedereen mag lezen, alleen admins schrijven
CREATE POLICY "Milestones leesbaar voor ingelogde gebruikers"
  ON milestones FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Alleen admins mogen milestones beheren"
  ON milestones FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- User_milestones: alleen eigen rijen zien
CREATE POLICY "Gebruiker ziet eigen milestone voortgang"
  ON user_milestones FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Systeem mag user_milestones aanmaken"
  ON user_milestones FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Gebruiker mag eigen user_milestone updaten (claimen)"
  ON user_milestones FOR UPDATE
  USING (user_id = auth.uid());

-- Discount_codes: gebruiker ziet eigen codes, admins alles
CREATE POLICY "Gebruiker ziet eigen kortingscodes"
  ON discount_codes FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Alleen admins mogen kortingscodes aanmaken"
  ON discount_codes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Systeem mag kortingscode als gebruikt markeren"
  ON discount_codes FOR UPDATE
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Login_streaks: alleen eigen rij
CREATE POLICY "Gebruiker ziet eigen streak"
  ON login_streaks FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Gebruiker mag eigen streak upserten"
  ON login_streaks FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── 6. SEED: EERSTE MILESTONES ─────────────────────────────────────────────

INSERT INTO milestones (title, description, goal_type, goal_value, benefit_type, benefit_description, sort_order) VALUES
  ('Eerste configuratie', 'Maak je eerste spiegel aan in de configurator.', 'configs', 1, 'custom', 'Persoonlijke onboarding call met LoooX', 10),
  ('Ontwerper', 'Maak 5 configuraties aan.', 'configs', 5, 'discount_pct', null, 20),
  ('Eerste bestelling', 'Plaats je eerste order via het portaal.', 'orders', 1, 'custom', 'Welkomstpakket met merkmateriaal', 30),
  ('Vaste partner', 'Bereik 5 bestellingen.', 'orders', 5, 'discount_pct', null, 40),
  ('Signature status', 'Bereik 10 bestellingen.', 'orders', 10, 'discount_pct', null, 50)
ON CONFLICT DO NOTHING;

UPDATE milestones SET benefit_value = 5  WHERE title = 'Ontwerper';
UPDATE milestones SET benefit_value = 10 WHERE title = 'Vaste partner';
UPDATE milestones SET benefit_value = 12 WHERE title = 'Signature status';
