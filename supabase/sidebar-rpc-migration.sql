-- ─── SIDEBAR RPC MIGRATION ───────────────────────────────────────────────────
-- Vervangt de 13 losse queries (4 sequentiële golven) van fetchSidebarData
-- door één enkele RPC-call. Doet ook de login-streak-update server-side in
-- hetzelfde roundtrip (was fire-and-forget vanuit het read-pad).
--
-- Veiligheid: SECURITY DEFINER, gebruikt uitsluitend auth.uid() — geen
-- spoofbare parameters. Alleen aanroepbaar door authenticated.

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
  v_special boolean; -- international/groothandel: geen milestones/streaks
  v_company_user_ids uuid[];
  v_today date := (now() AT TIME ZONE 'utc')::date;
  v_streak record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Niet ingelogd';
  END IF;

  SELECT full_name, company, company_id, tier, is_admin, is_sub_admin,
         avatar_url, is_international, is_groothandel
    INTO v_profile FROM profiles WHERE id = v_uid;

  SELECT role, company_id, can_configure
    INTO v_member FROM company_members WHERE user_id = v_uid LIMIT 1;

  -- company_members is bron van waarheid — profile.company_id kan stale zijn
  v_company_id   := v_member.company_id;
  v_is_admin     := COALESCE(v_profile.is_admin, false);
  v_is_sub_admin := COALESCE(v_profile.is_sub_admin, false);
  v_is_manager   := COALESCE(v_member.role = 'manager', false);
  v_special      := COALESCE(v_profile.is_international, false)
                 OR COALESCE(v_profile.is_groothandel, false);

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

REVOKE ALL ON FUNCTION public.get_sidebar_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_sidebar_data() TO authenticated;

-- ─── Ontbrekende indexes (audit P9) ─────────────────────────────────────────
-- company_members(user_id): op vrijwel elke pagina wordt op user_id gefilterd,
-- maar alleen (company_id, user_id) bestond — verkeerde leading column.
CREATE INDEX IF NOT EXISTS idx_company_members_user_id ON company_members (user_id);
-- pendingCount in sidebar + admin gebruikers
CREATE INDEX IF NOT EXISTS idx_profiles_approval_status ON profiles (approval_status);
-- admin configuraties sortering
CREATE INDEX IF NOT EXISTS idx_configurations_updated_at ON configurations (updated_at DESC);
