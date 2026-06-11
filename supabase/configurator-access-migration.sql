-- ─── CONFIGURATOR ACCESS: drie standen per account (epic EN/EN, sprint 1) ────
-- Vervangt de betekenis van is_groothandel (OF/OF) door drie standen:
--   'maatwerk' (default) | 'beide' | 'project'
-- Additief en veilig op live: oude code leest is_groothandel, die via een
-- sync-trigger gespiegeld blijft aan de nieuwe kolom (en andersom).

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS configurator_access text NOT NULL DEFAULT 'maatwerk'
  CHECK (configurator_access IN ('maatwerk', 'beide', 'project'));

-- Migratie: bestaande groothandel-accounts → 'alleen project' (besluit B6)
UPDATE public.profiles SET configurator_access = 'project' WHERE is_groothandel = true;

-- Sync beide kolommen tijdens de transitie (oude prod-code schrijft/leest de
-- boolean, nieuwe code de standen). BEFORE-trigger, dus geen recursie.
CREATE OR REPLACE FUNCTION public.sync_configurator_access()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.configurator_access IS DISTINCT FROM OLD.configurator_access THEN
    NEW.is_groothandel := (NEW.configurator_access = 'project');
  ELSIF NEW.is_groothandel IS DISTINCT FROM OLD.is_groothandel THEN
    NEW.configurator_access := CASE WHEN NEW.is_groothandel THEN 'project' ELSE 'maatwerk' END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_configurator_access_trigger ON public.profiles;
CREATE TRIGGER sync_configurator_access_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_configurator_access();

-- Gevoelige kolom: alleen admins mogen 'm wijzigen (zelfde bescherming als
-- is_groothandel). Let op: 'protect_...' draait alfabetisch vóór 'sync_...',
-- dus een geblokkeerde wijziging wordt nooit gespiegeld.
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
    NEW.is_admin             IS DISTINCT FROM OLD.is_admin             OR
    NEW.approval_status      IS DISTINCT FROM OLD.approval_status      OR
    NEW.korting              IS DISTINCT FROM OLD.korting              OR
    NEW.is_international     IS DISTINCT FROM OLD.is_international     OR
    NEW.is_groothandel       IS DISTINCT FROM OLD.is_groothandel       OR
    NEW.is_sub_admin         IS DISTINCT FROM OLD.is_sub_admin         OR
    NEW.configurator_access  IS DISTINCT FROM OLD.configurator_access
  ) THEN
    RAISE EXCEPTION 'Niet toegestaan: gevoelige profielkolommen kunnen niet worden aangepast';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sidebar-RPC: nieuwe kolom meegeven (extra jsonb-veld, oude code negeert het)
CREATE OR REPLACE FUNCTION public.get_sidebar_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile record;
  v_member record;
  v_company_id uuid;
  v_is_admin boolean;
  v_is_sub_admin boolean;
  v_is_manager boolean;
  v_special boolean; -- international/project-only: geen milestones/streaks
  v_company_user_ids uuid[];
  v_today date := (now() AT TIME ZONE 'utc')::date;
  v_streak record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Niet ingelogd';
  END IF;

  SELECT full_name, company, company_id, tier, is_admin, is_sub_admin,
         avatar_url, is_international, is_groothandel, configurator_access
    INTO v_profile FROM profiles WHERE id = v_uid;

  SELECT role, company_id, can_configure
    INTO v_member FROM company_members WHERE user_id = v_uid LIMIT 1;

  -- company_members is bron van waarheid — profile.company_id kan stale zijn
  v_company_id   := v_member.company_id;
  v_is_admin     := COALESCE(v_profile.is_admin, false);
  v_is_sub_admin := COALESCE(v_profile.is_sub_admin, false);
  v_is_manager   := COALESCE(v_member.role = 'manager', false);
  v_special      := COALESCE(v_profile.is_international, false)
                 OR v_profile.configurator_access = 'project';

  IF v_company_id IS NULL THEN
    v_company_user_ids := ARRAY[v_uid];
  ELSE
    SELECT array_agg(DISTINCT u) INTO v_company_user_ids
    FROM (
      SELECT v_uid AS u
      UNION
      SELECT user_id FROM company_members WHERE company_id = v_company_id
    ) s;
  END IF;

  -- Login streak bijwerken in hetzelfde roundtrip (alleen reguliere dealers)
  IF NOT v_special THEN
    SELECT current_streak, longest_streak, last_login_date, total_days
      INTO v_streak FROM login_streaks WHERE user_id = v_uid;
    IF NOT FOUND THEN
      INSERT INTO login_streaks (user_id, current_streak, longest_streak, last_login_date, total_days)
      VALUES (v_uid, 1, 1, v_today, 1)
      ON CONFLICT (user_id) DO NOTHING;
      SELECT current_streak, longest_streak, last_login_date, total_days
        INTO v_streak FROM login_streaks WHERE user_id = v_uid;
    ELSIF v_streak.last_login_date IS DISTINCT FROM v_today THEN
      UPDATE login_streaks SET
        current_streak  = CASE WHEN last_login_date = v_today - 1 THEN current_streak + 1 ELSE 1 END,
        longest_streak  = GREATEST(longest_streak,
                          CASE WHEN last_login_date = v_today - 1 THEN current_streak + 1 ELSE 1 END),
        last_login_date = v_today,
        total_days      = COALESCE(total_days, 0) + 1,
        updated_at      = now()
      WHERE user_id = v_uid;
      SELECT current_streak, longest_streak, last_login_date, total_days
        INTO v_streak FROM login_streaks WHERE user_id = v_uid;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'profile', to_jsonb(v_profile),
    'member',  to_jsonb(v_member),
    'company_order_count', count_company_orders(v_uid),
    'own_order_count', (SELECT count(*) FROM orders WHERE user_id = v_uid),
    'pending_count',
      CASE WHEN v_is_admin OR v_is_sub_admin
           THEN (SELECT count(*) FROM profiles WHERE approval_status = 'pending')
           ELSE 0 END,
    'pending_colleagues_count',
      CASE WHEN v_is_manager AND v_company_id IS NOT NULL
           THEN (SELECT count(*) FROM profiles
                 WHERE company_id = v_company_id AND approval_status = 'pending')
           ELSE 0 END,
    'milestones',
      CASE WHEN v_special THEN '[]'::jsonb
           ELSE COALESCE((
             SELECT jsonb_agg(jsonb_build_object(
               'id', id, 'title', title, 'goal_type', goal_type, 'goal_value', goal_value
             ) ORDER BY sort_order)
             FROM milestones WHERE is_active
           ), '[]'::jsonb) END,
    'revenue_sum',
      CASE WHEN v_special THEN 0 ELSE sum_order_revenue(v_uid) END,
    'streak',
      CASE WHEN v_special THEN NULL ELSE to_jsonb(v_streak) END,
    'config_count',
      (SELECT count(*) FROM configurations
       WHERE user_id = ANY(v_company_user_ids) AND status = 'saved'),
    'achieved_milestone_ids',
      CASE WHEN v_special THEN '[]'::jsonb
           ELSE COALESCE((
             SELECT jsonb_agg(DISTINCT milestone_id)
             FROM user_milestones WHERE user_id = ANY(v_company_user_ids)
           ), '[]'::jsonb) END
  );
END;
$$;

COMMIT;
