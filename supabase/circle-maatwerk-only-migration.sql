-- ─── CIRCLE: ALLEEN MAATWERK TELT (epic EN/EN, sprint 3, besluit B4) ─────────
-- Projectspiegel-orders en -configuraties tellen niet mee voor milestones,
-- omzet en tiers. Gedragsneutraal voor bestaande accounts: project-accounts
-- zien Circle niet, maatwerk-accounts hebben geen projectspiegel-data.
-- Sidebar houdt config_count (alles, voor het menu-badge) en krijgt
-- maatwerk_config_count erbij (voor milestone-voortgang).

BEGIN;

CREATE OR REPLACE FUNCTION public.sum_order_revenue(p_user_id uuid)
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM(o.total_price::numeric), 0)
  FROM orders o
  JOIN profiles p ON o.user_id = p.id
  LEFT JOIN configurations c ON c.id = o.configuration_id
  WHERE (
    (
      (SELECT company_id FROM profiles WHERE id = p_user_id) IS NOT NULL
      AND p.company_id = (SELECT company_id FROM profiles WHERE id = p_user_id)
    )
    OR (
      (SELECT company_id FROM profiles WHERE id = p_user_id) IS NULL
      AND o.user_id = p_user_id
    )
  )
  AND COALESCE(c.selected_options->>'shape', '') <> 'projectspiegel'
$$;

CREATE OR REPLACE FUNCTION public.count_company_orders(p_user_id uuid)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)
  FROM orders o
  JOIN profiles p ON o.user_id = p.id
  LEFT JOIN configurations c ON c.id = o.configuration_id
  WHERE (
    (
      (SELECT company_id FROM profiles WHERE id = p_user_id) IS NOT NULL
      AND p.company_id = (SELECT company_id FROM profiles WHERE id = p_user_id)
    )
    OR (
      (SELECT company_id FROM profiles WHERE id = p_user_id) IS NULL
      AND o.user_id = p_user_id
    )
  )
  AND COALESCE(c.selected_options->>'shape', '') <> 'projectspiegel'
$$;

CREATE OR REPLACE FUNCTION public.count_company_configs(p_user_id uuid)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)
  FROM configurations c
  JOIN profiles p ON c.user_id = p.id
  WHERE (
    (
      (SELECT company_id FROM profiles WHERE id = p_user_id) IS NOT NULL
      AND p.company_id = (SELECT company_id FROM profiles WHERE id = p_user_id)
    )
    OR (
      (SELECT company_id FROM profiles WHERE id = p_user_id) IS NULL
      AND c.user_id = p_user_id
    )
  )
  AND COALESCE(c.selected_options->>'shape', '') <> 'projectspiegel'
$$;

CREATE OR REPLACE FUNCTION public.get_user_configured_shapes(p_user_id uuid)
RETURNS TABLE(shape text, shape_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT (selected_options->>'shape')::text AS shape,
         COUNT(*)::bigint AS shape_count
  FROM configurations
  WHERE user_id = p_user_id
    AND (selected_options->>'shape') IS NOT NULL
    AND (selected_options->>'shape') <> 'projectspiegel'
  GROUP BY (selected_options->>'shape')::text
$$;

-- Sidebar: config_count blijft het totaal (menu-badge); maatwerk_config_count
-- voedt de milestone-voortgang (besluit B4)
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
    'maatwerk_config_count',
      (SELECT count(*) FROM configurations
       WHERE user_id = ANY(v_company_user_ids) AND status = 'saved'
         AND COALESCE(selected_options->>'shape', '') <> 'projectspiegel'),
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
