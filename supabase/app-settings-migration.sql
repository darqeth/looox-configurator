-- ─── App Settings tabel ───────────────────────────────────────────────────────
-- Beheert instelbare waarden zoals notificatie-emailadressen.

CREATE TABLE IF NOT EXISTS app_settings (
  id       text PRIMARY KEY DEFAULT 'singleton',
  notification_emails text[] NOT NULL DEFAULT ARRAY['marketing@rmsanitair.nl']::text[]
);

-- Zorg dat er altijd een rij is
INSERT INTO app_settings (id) VALUES ('singleton')
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ingelogde gebruikers mogen instellingen lezen"
  ON app_settings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Alleen admins mogen instellingen aanpassen"
  ON app_settings FOR UPDATE
  USING (is_looox_admin());
