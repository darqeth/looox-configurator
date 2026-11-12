-- ─── CONFIGURATOR 2.0: Tailor-Made meubels (fase 1) ─────────────────────────
-- Run eenmalig in Supabase Dashboard → SQL Editor.
-- Additief en veilig op live: de huidige productiecode leest deze kolommen niet.
--   profiles.meubel_access  → admin zet per account meubels aan (default uit)
--   companies.meubel_factor → manager stelt de brutofactor in (default 2)

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS meubel_access boolean NOT NULL DEFAULT false;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS meubel_factor numeric(4,2) NOT NULL DEFAULT 2
  CHECK (meubel_factor > 0 AND meubel_factor <= 10);

-- meubel_access is gevoelig: alleen admins mogen hem wijzigen.
-- Zelfde functie als in visualisation-credits-migration.sql, met één kolom erbij.
CREATE OR REPLACE FUNCTION protect_profile_sensitive_columns()
RETURNS TRIGGER AS $$
DECLARE
  caller uuid := auth.uid();
  caller_is_admin boolean;
BEGIN
  -- Interne functies (claim/grant) zetten een transactie-lokale vlag;
  -- directe REST-calls van gebruikers kunnen dat niet
  IF current_setting('app.bypass_profile_guard', true) = '1' THEN
    RETURN NEW;
  END IF;

  IF caller IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT is_admin INTO caller_is_admin FROM profiles WHERE id = caller;
  IF caller_is_admin THEN
    RETURN NEW;
  END IF;

  IF (
    NEW.is_admin                    IS DISTINCT FROM OLD.is_admin                    OR
    NEW.approval_status             IS DISTINCT FROM OLD.approval_status             OR
    NEW.korting                     IS DISTINCT FROM OLD.korting                     OR
    NEW.is_international            IS DISTINCT FROM OLD.is_international            OR
    NEW.is_groothandel              IS DISTINCT FROM OLD.is_groothandel              OR
    NEW.is_sub_admin                IS DISTINCT FROM OLD.is_sub_admin                OR
    NEW.configurator_access         IS DISTINCT FROM OLD.configurator_access         OR
    NEW.meubel_access               IS DISTINCT FROM OLD.meubel_access               OR
    NEW.visualisation_bonus_credits IS DISTINCT FROM OLD.visualisation_bonus_credits
  ) THEN
    RAISE EXCEPTION 'Niet toegestaan: gevoelige profielkolommen kunnen niet worden aangepast';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
