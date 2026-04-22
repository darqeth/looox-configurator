-- ─── RLS-FIX MIGRATION ─────────────────────────────────────────────────────
-- Schakelt Row-Level Security in voor tabellen die dat nog missen.
-- Tabellen al beveiligd: companies, company_members, company_invites,
-- milestones, user_milestones, discount_codes, login_streaks,
-- discount_code_uses, notifications

-- ─── Helper: recursie-vrije admin-check ──────────────────────────────────────
-- SECURITY DEFINER bypast RLS → geen oneindige lus als profiles zelf RLS heeft.

CREATE OR REPLACE FUNCTION is_looox_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

-- ─── 1. CONFIGURATIONS ────────────────────────────────────────────────────────
-- Policies al aangemaakt via colleagues-migration.sql; alleen ENABLE ontbrak.

ALTER TABLE configurations ENABLE ROW LEVEL SECURITY;

-- ─── 2. ORDERS ────────────────────────────────────────────────────────────────
-- Policies al aangemaakt via colleagues-migration.sql; alleen ENABLE ontbrak.

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Admin mag orders updaten (status-wijzigingen vanuit admin panel)
CREATE POLICY "Admin mag bestellingen updaten"
  ON orders FOR UPDATE
  USING (is_looox_admin());

-- ─── 3. PROFILES ─────────────────────────────────────────────────────────────
-- Gebruikt is_looox_admin() (SECURITY DEFINER) om recursie te vermijden.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gebruiker ziet eigen profiel en collega's"
  ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR is_looox_admin()
    OR (
      company_id IS NOT NULL
      AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Gebruiker bewerkt eigen profiel"
  ON profiles FOR UPDATE
  USING (id = auth.uid() OR is_looox_admin());

CREATE POLICY "Systeem en admin mogen profielen aanmaken"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid() OR is_looox_admin());

CREATE POLICY "Alleen admins verwijderen profielen"
  ON profiles FOR DELETE
  USING (is_looox_admin());

-- ─── 4. CHANGELOGS ────────────────────────────────────────────────────────────

ALTER TABLE changelogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Changelogs leesbaar voor ingelogde gebruikers"
  ON changelogs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Alleen admins beheren changelogs"
  ON changelogs FOR ALL
  USING (is_looox_admin());

-- ─── 5. PRODUCTS ──────────────────────────────────────────────────────────────

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Producten leesbaar voor ingelogde gebruikers"
  ON products FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Alleen admins beheren producten"
  ON products FOR ALL
  USING (is_looox_admin());

-- ─── 6. PRODUCT_SHAPES ────────────────────────────────────────────────────────

ALTER TABLE product_shapes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product shapes leesbaar voor ingelogde gebruikers"
  ON product_shapes FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Alleen admins beheren product shapes"
  ON product_shapes FOR ALL
  USING (is_looox_admin());

-- ─── 7. OPTION_GROUPS ─────────────────────────────────────────────────────────

ALTER TABLE option_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Option groups leesbaar voor ingelogde gebruikers"
  ON option_groups FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Alleen admins beheren option groups"
  ON option_groups FOR ALL
  USING (is_looox_admin());

-- ─── 8. OPTIONS ───────────────────────────────────────────────────────────────

ALTER TABLE options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Options leesbaar voor ingelogde gebruikers"
  ON options FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Alleen admins beheren options"
  ON options FOR ALL
  USING (is_looox_admin());

-- ─── 9. RSS_CACHE ─────────────────────────────────────────────────────────────
-- Cron job gebruikt service role → bypast RLS automatisch.

ALTER TABLE rss_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RSS cache leesbaar voor ingelogde gebruikers"
  ON rss_cache FOR SELECT
  USING (auth.role() = 'authenticated');
