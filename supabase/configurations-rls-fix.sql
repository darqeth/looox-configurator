-- Fix RLS INSERT policy voor configurations
-- Probleem: gebruikers met company_id maar zonder company_members entry
-- (bijv. internationale accounts) kregen "row-level security policy violation"
--
-- Oplossing: voeg twee extra gevallen toe:
--   1. is_looox_admin() mag altijd opslaan
--   2. Gebruiker heeft company_id maar GEEN company_members entry → behandel als solo

DROP POLICY IF EXISTS "Gebruiker mag configuratie aanmaken" ON configurations;

CREATE POLICY "Gebruiker mag configuratie aanmaken"
  ON configurations FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      -- Solo user (geen company_id)
      my_company_id() IS NULL
      -- Gebruiker heeft company_id maar geen company_members rij (edge case)
      OR NOT EXISTS (
        SELECT 1 FROM company_members
        WHERE user_id = auth.uid() AND company_id = my_company_id()
      )
      -- Manager van het bedrijf
      OR i_am_manager()
      -- LoooX admin
      OR is_looox_admin()
      -- Lid met expliciete can_configure toestemming
      OR EXISTS (
        SELECT 1 FROM company_members
        WHERE user_id = auth.uid()
          AND company_id = my_company_id()
          AND can_configure = true
      )
    )
  );
