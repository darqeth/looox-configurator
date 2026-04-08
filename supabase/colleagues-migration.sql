-- LoooX Configurator — Collega's feature
-- Run eenmalig in Supabase Dashboard → SQL Editor
-- ⚠️  Voer stap voor stap uit — lees de commentaren

-- ─── 1. COMPANIES ────────────────────────────────────────────────────────────
-- Bedrijven als echte entiteiten (was alleen een string in profiles)

CREATE TABLE IF NOT EXISTS companies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 2. COMPANY_MEMBERS ──────────────────────────────────────────────────────
-- Lidmaatschap + rechten per gebruiker per bedrijf

CREATE TABLE IF NOT EXISTS company_members (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id                 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role                    TEXT NOT NULL DEFAULT 'member'
                            CHECK (role IN ('manager', 'member')),
  can_order               BOOLEAN NOT NULL DEFAULT true,
  can_see_purchase_prices BOOLEAN NOT NULL DEFAULT false,
  can_configure           BOOLEAN NOT NULL DEFAULT true,
  own_configs_only        BOOLEAN NOT NULL DEFAULT false,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);

-- ─── 3. COMPANY_INVITES ───────────────────────────────────────────────────────
-- Invite-tokens voor collega's (manager genereert link, stuurt zelf)

CREATE TABLE IF NOT EXISTS company_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invited_by  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Één openstaande invite per e-mail per bedrijf
  UNIQUE (company_id, email)
);

-- ─── 4. PROFILES — company_id KOLOM ──────────────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- ─── 5. BACKFILL — bestaande gebruikers migreren ─────────────────────────────
-- Maakt een company-rij per unieke company-string en koppelt profielen

-- 5a. Companies aanmaken op basis van bestaande company-strings
INSERT INTO companies (name)
SELECT DISTINCT company
FROM profiles
WHERE company IS NOT NULL AND company <> ''
ON CONFLICT DO NOTHING;

-- 5b. profiles.company_id vullen
UPDATE profiles p
SET company_id = c.id
FROM companies c
WHERE p.company = c.name
  AND p.company IS NOT NULL
  AND p.company <> ''
  AND p.company_id IS NULL;

-- 5c. company_members aanmaken voor bestaande goedgekeurde gebruikers
-- Vroegste registratie per bedrijf wordt manager, de rest member
INSERT INTO company_members (company_id, user_id, role)
SELECT
  p.company_id,
  p.id,
  CASE
    WHEN p.created_at = first_per_company.min_created THEN 'manager'
    ELSE 'member'
  END
FROM profiles p
JOIN (
  SELECT company_id, MIN(created_at) AS min_created
  FROM profiles
  WHERE company_id IS NOT NULL
  GROUP BY company_id
) first_per_company ON p.company_id = first_per_company.company_id
WHERE p.company_id IS NOT NULL
  AND p.approval_status = 'approved'
ON CONFLICT (company_id, user_id) DO NOTHING;

-- ─── 6. HELPER FUNCTIES ───────────────────────────────────────────────────────
-- Herbruikbaar in RLS policies — STABLE zodat PostgreSQL ze cached per query

CREATE OR REPLACE FUNCTION my_company_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION i_am_manager()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_members
    WHERE user_id = auth.uid()
      AND company_id = my_company_id()
      AND role = 'manager'
  )
$$;

-- ─── 7. RLS — NIEUWE TABELLEN ────────────────────────────────────────────────

ALTER TABLE companies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_invites ENABLE ROW LEVEL SECURITY;

-- Companies: alleen lezen als je er lid van bent
DROP POLICY IF EXISTS "Gebruiker ziet eigen bedrijf" ON companies;
CREATE POLICY "Gebruiker ziet eigen bedrijf"
  ON companies FOR SELECT
  USING (id = my_company_id());

DROP POLICY IF EXISTS "LoooX admin ziet alle bedrijven" ON companies;
CREATE POLICY "LoooX admin ziet alle bedrijven"
  ON companies FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Company_members: collega's van hetzelfde bedrijf zichtbaar
DROP POLICY IF EXISTS "Collega's van zelfde bedrijf zichtbaar" ON company_members;
CREATE POLICY "Collega's van zelfde bedrijf zichtbaar"
  ON company_members FOR SELECT
  USING (company_id = my_company_id());

DROP POLICY IF EXISTS "Alleen manager beheert members" ON company_members;
CREATE POLICY "Alleen manager beheert members"
  ON company_members FOR ALL
  USING (
    i_am_manager()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Company_invites: manager ziet en beheert invites van zijn bedrijf
DROP POLICY IF EXISTS "Manager ziet invites van zijn bedrijf" ON company_invites;
CREATE POLICY "Manager ziet invites van zijn bedrijf"
  ON company_invites FOR SELECT
  USING (company_id = my_company_id() AND i_am_manager());

DROP POLICY IF EXISTS "Manager maakt invites aan" ON company_invites;
CREATE POLICY "Manager maakt invites aan"
  ON company_invites FOR INSERT
  WITH CHECK (company_id = my_company_id() AND i_am_manager());

DROP POLICY IF EXISTS "Manager verwijdert invites" ON company_invites;
CREATE POLICY "Manager verwijdert invites"
  ON company_invites FOR DELETE
  USING (company_id = my_company_id() AND i_am_manager());

DROP POLICY IF EXISTS "Systeem accepteert invite (token-check in server action)" ON company_invites;
CREATE POLICY "Systeem accepteert invite (token-check in server action)"
  ON company_invites FOR UPDATE
  USING (true);  -- server action valideert token zelf; RLS staat update toe

DROP POLICY IF EXISTS "LoooX admin ziet alle invites" ON company_invites;
CREATE POLICY "LoooX admin ziet alle invites"
  ON company_invites FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- ─── 8. RLS — CONFIGURATIONS (uitbreiden voor company-zichtbaarheid) ─────────

DROP POLICY IF EXISTS "Gebruiker ziet eigen configuraties" ON configurations;
DROP POLICY IF EXISTS "Gebruiker mag configuraties aanmaken" ON configurations;
DROP POLICY IF EXISTS "Gebruiker bewerkt eigen configuraties" ON configurations;
DROP POLICY IF EXISTS "Gebruiker verwijdert eigen configuraties" ON configurations;
DROP POLICY IF EXISTS "Admin ziet alle configuraties" ON configurations;

-- SELECT: eigen config + bedrijfscollega's (tenzij own_configs_only)
CREATE POLICY "Gebruiker ziet eigen en toegestane configuraties"
  ON configurations FOR SELECT
  USING (
    -- Eigen config: altijd
    user_id = auth.uid()
    OR
    -- Collega's config: zelfde bedrijf + viewer heeft NIET own_configs_only
    (
      (SELECT company_id FROM profiles WHERE id = configurations.user_id) IS NOT NULL
      AND (SELECT company_id FROM profiles WHERE id = configurations.user_id) = my_company_id()
      AND (
        i_am_manager()
        OR NOT EXISTS (
          SELECT 1 FROM company_members
          WHERE user_id = auth.uid()
            AND company_id = my_company_id()
            AND own_configs_only = true
        )
      )
    )
    OR
    -- LoooX admin ziet alles
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- INSERT: alleen als can_configure (of manager, of solo user)
CREATE POLICY "Gebruiker mag configuratie aanmaken"
  ON configurations FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      my_company_id() IS NULL
      OR i_am_manager()
      OR EXISTS (
        SELECT 1 FROM company_members
        WHERE user_id = auth.uid()
          AND company_id = my_company_id()
          AND can_configure = true
      )
    )
  );

-- UPDATE: eigen config + managers kunnen collega-configs bewerken
CREATE POLICY "Gebruiker bewerkt eigen of collega configuraties"
  ON configurations FOR UPDATE
  USING (
    user_id = auth.uid()
    OR (
      (SELECT company_id FROM profiles WHERE id = configurations.user_id) = my_company_id()
      AND i_am_manager()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- DELETE: eigen config + managers kunnen collega-configs verwijderen
CREATE POLICY "Gebruiker verwijdert eigen of manager verwijdert collega configs"
  ON configurations FOR DELETE
  USING (
    user_id = auth.uid()
    OR (
      (SELECT company_id FROM profiles WHERE id = configurations.user_id) = my_company_id()
      AND i_am_manager()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ─── 9. RLS — ORDERS (uitbreiden voor company-zichtbaarheid) ─────────────────

DROP POLICY IF EXISTS "Gebruiker ziet eigen bestellingen" ON orders;
DROP POLICY IF EXISTS "Gebruiker plaatst bestelling" ON orders;
DROP POLICY IF EXISTS "Admin ziet alle bestellingen" ON orders;

CREATE POLICY "Gebruiker ziet eigen en toegestane bestellingen"
  ON orders FOR SELECT
  USING (
    user_id = auth.uid()
    OR (
      (SELECT company_id FROM profiles WHERE id = orders.user_id) IS NOT NULL
      AND (SELECT company_id FROM profiles WHERE id = orders.user_id) = my_company_id()
      AND (
        i_am_manager()
        OR NOT EXISTS (
          SELECT 1 FROM company_members
          WHERE user_id = auth.uid()
            AND company_id = my_company_id()
            AND own_configs_only = true
        )
      )
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Gebruiker plaatst bestelling als can_order"
  ON orders FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      my_company_id() IS NULL
      OR i_am_manager()
      OR EXISTS (
        SELECT 1 FROM company_members
        WHERE user_id = auth.uid()
          AND company_id = my_company_id()
          AND can_order = true
      )
    )
  );

-- ─── 10. COMPANY-BREDE MILESTONE RPCs ────────────────────────────────────────

-- sum_order_revenue: telt nu alle orders van het hele bedrijf
CREATE OR REPLACE FUNCTION sum_order_revenue(p_user_id uuid)
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM(o.total_price::numeric), 0)
  FROM orders o
  JOIN profiles p ON o.user_id = p.id
  WHERE (
    -- User heeft een company: tel company-breed
    (SELECT company_id FROM profiles WHERE id = p_user_id) IS NOT NULL
    AND p.company_id = (SELECT company_id FROM profiles WHERE id = p_user_id)
  )
  OR (
    -- Solo user: alleen eigen orders
    (SELECT company_id FROM profiles WHERE id = p_user_id) IS NULL
    AND o.user_id = p_user_id
  )
$$;

-- Nieuwe RPC: company-brede order count
CREATE OR REPLACE FUNCTION count_company_orders(p_user_id uuid)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)
  FROM orders o
  JOIN profiles p ON o.user_id = p.id
  WHERE (
    (SELECT company_id FROM profiles WHERE id = p_user_id) IS NOT NULL
    AND p.company_id = (SELECT company_id FROM profiles WHERE id = p_user_id)
  )
  OR (
    (SELECT company_id FROM profiles WHERE id = p_user_id) IS NULL
    AND o.user_id = p_user_id
  )
$$;

-- Nieuwe RPC: company-brede config count
CREATE OR REPLACE FUNCTION count_company_configs(p_user_id uuid)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)
  FROM configurations c
  JOIN profiles p ON c.user_id = p.id
  WHERE (
    (SELECT company_id FROM profiles WHERE id = p_user_id) IS NOT NULL
    AND p.company_id = (SELECT company_id FROM profiles WHERE id = p_user_id)
  )
  OR (
    (SELECT company_id FROM profiles WHERE id = p_user_id) IS NULL
    AND c.user_id = p_user_id
  )
$$;

-- ─── 11. AUTH METADATA — sync trigger uitbreiden ─────────────────────────────
-- Voegt company_id en company_role toe aan raw_app_meta_data
-- zodat middleware dit kan lezen zonder extra DB-query

CREATE OR REPLACE FUNCTION public.sync_profile_metadata_to_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role
  FROM company_members
  WHERE user_id = NEW.id
  LIMIT 1;

  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object(
      'approval_status', NEW.approval_status,
      'company_id',      NEW.company_id,
      'company_role',    COALESCE(v_role, 'solo')
    )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Vervang de bestaande trigger
DROP TRIGGER IF EXISTS sync_approval_status_trigger ON public.profiles;
CREATE TRIGGER sync_profile_metadata_trigger
AFTER INSERT OR UPDATE OF approval_status, company_id ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_metadata_to_auth();

-- Backfill auth metadata voor bestaande users
UPDATE profiles SET updated_at = now() WHERE true;
-- (triggert de sync functie voor alle profielen)
-- Als profiles geen updated_at heeft, gebruik dan:
-- SELECT sync_profile_metadata_to_auth() -- werkt niet als set-based call
-- In dat geval: run onderstaande handmatig:
/*
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT * FROM profiles LOOP
    UPDATE auth.users
    SET raw_app_meta_data =
      COALESCE(raw_app_meta_data, '{}'::jsonb) ||
      jsonb_build_object(
        'approval_status', r.approval_status,
        'company_id',      r.company_id,
        'company_role',    COALESCE((SELECT role FROM company_members WHERE user_id = r.id LIMIT 1), 'solo')
      )
    WHERE id = r.id;
  END LOOP;
END $$;
*/
