-- Voorkomt dat een gebruiker gevoelige kolommen op zijn eigen profiel aanpast
-- (is_admin, approval_status, korting, is_international, is_groothandel, is_sub_admin)
-- via de Supabase REST API. De UPDATE-RLS staat eigen-rij updates toe maar kan
-- geen kolomrestrictie afdwingen — deze trigger vult dat gat.

CREATE OR REPLACE FUNCTION protect_profile_sensitive_columns()
RETURNS TRIGGER AS $$
DECLARE
  caller uuid := auth.uid();
  caller_is_admin boolean;
BEGIN
  -- Service role heeft auth.uid() = NULL → altijd toestaan (admin acties via server)
  IF caller IS NULL THEN
    RETURN NEW;
  END IF;

  -- Admin mag alles aanpassen
  SELECT is_admin INTO caller_is_admin FROM profiles WHERE id = caller;
  IF caller_is_admin THEN
    RETURN NEW;
  END IF;

  -- Blokkeer wijzigingen aan gevoelige kolommen voor gewone gebruikers
  IF (
    NEW.is_admin        IS DISTINCT FROM OLD.is_admin        OR
    NEW.approval_status IS DISTINCT FROM OLD.approval_status OR
    NEW.korting         IS DISTINCT FROM OLD.korting         OR
    NEW.is_international IS DISTINCT FROM OLD.is_international OR
    NEW.is_groothandel  IS DISTINCT FROM OLD.is_groothandel  OR
    NEW.is_sub_admin    IS DISTINCT FROM OLD.is_sub_admin
  ) THEN
    RAISE EXCEPTION 'Niet toegestaan: gevoelige profielkolommen kunnen niet worden aangepast';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS protect_profile_sensitive_columns_trigger ON profiles;

CREATE TRIGGER protect_profile_sensitive_columns_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profile_sensitive_columns();
