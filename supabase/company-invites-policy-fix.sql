-- ─── COMPANY_INVITES UPDATE-POLICY FIX (audit S6) ────────────────────────────
-- De oude policy "Systeem accepteert invite" had USING (true): elke ingelogde
-- gebruiker kon elke invite-rij wijzigen (rechten, e-mail) mits id bekend.
--
-- Werkelijk gebruik van UPDATE op company_invites:
--   1. Invite-acceptatie (auth.ts:172) → service role, bypassed RLS
--   2. Manager past rechten van openstaande invite aan (colleagues.ts:271)
--   3. Upsert-conflictpad bij opnieuw uitnodigen (colleagues.ts:63)
-- Alleen 2 en 3 hebben een policy nodig — beide zijn manager + eigen bedrijf.
--
-- Samen uitvoeren met profiles-rls-enable-migration.sql ('s avonds).

BEGIN;

DROP POLICY IF EXISTS "Systeem accepteert invite (token-check in server action)" ON public.company_invites;

CREATE POLICY "Manager beheert invites van eigen bedrijf" ON public.company_invites
  FOR UPDATE
  USING ((company_id = (SELECT my_company_id())) AND (SELECT i_am_manager()))
  WITH CHECK ((company_id = (SELECT my_company_id())) AND (SELECT i_am_manager()));

COMMIT;
