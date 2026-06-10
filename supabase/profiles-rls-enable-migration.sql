-- ─── PROFILES RLS ENABLE MIGRATION ──────────────────────────────────────────
-- Gegenereerd uit de live pg_policies op 2026-06-10.
-- Stap 1: SECURITY DEFINER helpers (bypassen RLS → geen recursie)
-- Stap 2: alle 24 policies met directe profiles-subqueries herschrijven
--         (semantisch identiek; helper-calls als (SELECT ...) voor InitPlan-cache)
-- Stap 3: RLS aanzetten op profiles
-- Rollback: ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

BEGIN;

CREATE OR REPLACE FUNCTION public.is_looox_admin_or_sub()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT is_admin OR is_sub_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.company_id_of(p_user uuid)
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT company_id FROM profiles WHERE id = p_user;
$$;

-- public.companies: LoooX admin ziet alle bedrijven
DROP POLICY IF EXISTS "LoooX admin ziet alle bedrijven" ON public.companies;
CREATE POLICY "LoooX admin ziet alle bedrijven" ON public.companies
  FOR ALL
  USING ((SELECT is_looox_admin()));

-- public.company_invites: LoooX admin ziet alle invites
DROP POLICY IF EXISTS "LoooX admin ziet alle invites" ON public.company_invites;
CREATE POLICY "LoooX admin ziet alle invites" ON public.company_invites
  FOR ALL
  USING ((SELECT is_looox_admin()));

-- public.company_members: Alleen manager beheert members
DROP POLICY IF EXISTS "Alleen manager beheert members" ON public.company_members;
CREATE POLICY "Alleen manager beheert members" ON public.company_members
  FOR ALL
  USING (((SELECT i_am_manager()) OR (SELECT is_looox_admin())));

-- public.configurations: Gebruiker bewerkt eigen of collega configuraties
DROP POLICY IF EXISTS "Gebruiker bewerkt eigen of collega configuraties" ON public.configurations;
CREATE POLICY "Gebruiker bewerkt eigen of collega configuraties" ON public.configurations
  FOR UPDATE
  USING (((user_id = auth.uid()) OR ((company_id_of(configurations.user_id) = (SELECT my_company_id())) AND (SELECT i_am_manager())) OR (SELECT is_looox_admin())));

-- public.configurations: Gebruiker verwijdert eigen of manager verwijdert collega config
DROP POLICY IF EXISTS "Gebruiker verwijdert eigen of manager verwijdert collega config" ON public.configurations;
CREATE POLICY "Gebruiker verwijdert eigen of manager verwijdert collega config" ON public.configurations
  FOR DELETE
  USING (((user_id = auth.uid()) OR ((company_id_of(configurations.user_id) = (SELECT my_company_id())) AND (SELECT i_am_manager())) OR (SELECT is_looox_admin())));

-- public.configurations: Gebruiker ziet eigen en toegestane configuraties
DROP POLICY IF EXISTS "Gebruiker ziet eigen en toegestane configuraties" ON public.configurations;
CREATE POLICY "Gebruiker ziet eigen en toegestane configuraties" ON public.configurations
  FOR SELECT
  USING (((user_id = auth.uid()) OR ((company_id_of(configurations.user_id) IS NOT NULL) AND (company_id_of(configurations.user_id) = (SELECT my_company_id())) AND ((SELECT i_am_manager()) OR (NOT (EXISTS ( SELECT 1
   FROM company_members
  WHERE ((company_members.user_id = auth.uid()) AND (company_members.company_id = (SELECT my_company_id())) AND (company_members.own_configs_only = true))))))) OR (SELECT is_looox_admin())));

-- public.control_tooltips: admin write
DROP POLICY IF EXISTS "admin write" ON public.control_tooltips;
CREATE POLICY "admin write" ON public.control_tooltips
  FOR ALL
  USING ((SELECT is_looox_admin_or_sub()));

-- public.discount_code_uses: Alleen admins verwijderen gebruik
DROP POLICY IF EXISTS "Alleen admins verwijderen gebruik" ON public.discount_code_uses;
CREATE POLICY "Alleen admins verwijderen gebruik" ON public.discount_code_uses
  FOR DELETE
  USING ((SELECT is_looox_admin()));

-- public.discount_code_uses: Gebruiker ziet eigen gebruik
DROP POLICY IF EXISTS "Gebruiker ziet eigen gebruik" ON public.discount_code_uses;
CREATE POLICY "Gebruiker ziet eigen gebruik" ON public.discount_code_uses
  FOR SELECT
  USING (((user_id = auth.uid()) OR (SELECT is_looox_admin())));

-- public.discount_codes: Gebruiker ziet eigen kortingscodes
DROP POLICY IF EXISTS "Gebruiker ziet eigen kortingscodes" ON public.discount_codes;
CREATE POLICY "Gebruiker ziet eigen kortingscodes" ON public.discount_codes
  FOR SELECT
  USING (((user_id = auth.uid()) OR (SELECT is_looox_admin())));

-- public.discount_codes: Kortingscode aanmaken
DROP POLICY IF EXISTS "Kortingscode aanmaken" ON public.discount_codes;
CREATE POLICY "Kortingscode aanmaken" ON public.discount_codes
  FOR INSERT
  WITH CHECK (((user_id = auth.uid()) OR (SELECT is_looox_admin())));

-- public.discount_codes: Systeem mag kortingscode als gebruikt markeren
DROP POLICY IF EXISTS "Systeem mag kortingscode als gebruikt markeren" ON public.discount_codes;
CREATE POLICY "Systeem mag kortingscode als gebruikt markeren" ON public.discount_codes
  FOR UPDATE
  USING (((user_id = auth.uid()) OR (SELECT is_looox_admin())));

-- public.downloads: Alleen admins kunnen downloads beheren
DROP POLICY IF EXISTS "Alleen admins kunnen downloads beheren" ON public.downloads;
CREATE POLICY "Alleen admins kunnen downloads beheren" ON public.downloads
  FOR ALL
  USING ((SELECT is_looox_admin()));

-- public.extra_option_tooltips: admin write
DROP POLICY IF EXISTS "admin write" ON public.extra_option_tooltips;
CREATE POLICY "admin write" ON public.extra_option_tooltips
  FOR ALL
  USING ((SELECT is_looox_admin_or_sub()));

-- public.login_streaks: Admin ziet alle login streaks
DROP POLICY IF EXISTS "Admin ziet alle login streaks" ON public.login_streaks;
CREATE POLICY "Admin ziet alle login streaks" ON public.login_streaks
  FOR SELECT
  USING ((SELECT is_looox_admin_or_sub()));

-- public.milestones: Alleen admins mogen milestones beheren
DROP POLICY IF EXISTS "Alleen admins mogen milestones beheren" ON public.milestones;
CREATE POLICY "Alleen admins mogen milestones beheren" ON public.milestones
  FOR ALL
  USING ((SELECT is_looox_admin()));

-- public.notifications: Alleen admins mogen notifications schrijven
DROP POLICY IF EXISTS "Alleen admins mogen notifications schrijven" ON public.notifications;
CREATE POLICY "Alleen admins mogen notifications schrijven" ON public.notifications
  FOR ALL
  USING ((SELECT is_looox_admin()));

-- public.order_drawings: admin beheert tekeningen
DROP POLICY IF EXISTS "admin beheert tekeningen" ON public.order_drawings;
CREATE POLICY "admin beheert tekeningen" ON public.order_drawings
  FOR ALL
  USING ((SELECT is_looox_admin()));

-- public.orders: Admin ziet alle orders
DROP POLICY IF EXISTS "Admin ziet alle orders" ON public.orders;
CREATE POLICY "Admin ziet alle orders" ON public.orders
  FOR ALL
  USING ((SELECT is_looox_admin()));

-- public.orders: Admins can update all orders
DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;
CREATE POLICY "Admins can update all orders" ON public.orders
  FOR UPDATE
  USING ((SELECT is_looox_admin()));

-- public.orders: Admins can view all orders
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders" ON public.orders
  FOR SELECT
  USING ((SELECT is_looox_admin()));

-- public.orders: Gebruiker ziet eigen en toegestane bestellingen
DROP POLICY IF EXISTS "Gebruiker ziet eigen en toegestane bestellingen" ON public.orders;
CREATE POLICY "Gebruiker ziet eigen en toegestane bestellingen" ON public.orders
  FOR SELECT
  USING (((user_id = auth.uid()) OR ((company_id_of(orders.user_id) IS NOT NULL) AND (company_id_of(orders.user_id) = (SELECT my_company_id())) AND ((SELECT i_am_manager()) OR (NOT (EXISTS ( SELECT 1
   FROM company_members
  WHERE ((company_members.user_id = auth.uid()) AND (company_members.company_id = (SELECT my_company_id())) AND (company_members.own_configs_only = true))))))) OR (SELECT is_looox_admin())));

-- public.profiles: Gebruiker ziet eigen profiel en collega's
DROP POLICY IF EXISTS "Gebruiker ziet eigen profiel en collega's" ON public.profiles;
CREATE POLICY "Gebruiker ziet eigen profiel en collega's" ON public.profiles
  FOR SELECT
  USING (((id = auth.uid()) OR (SELECT is_looox_admin()) OR ((company_id IS NOT NULL) AND (company_id = (SELECT my_company_id())))));

-- storage.objects: admins kunnen uploaden
DROP POLICY IF EXISTS "admins kunnen uploaden" ON storage.objects;
CREATE POLICY "admins kunnen uploaden" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'drawings'::text) AND (SELECT is_looox_admin())));

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

COMMIT;
