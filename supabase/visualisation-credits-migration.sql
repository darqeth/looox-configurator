-- ─── VISUALISATIE-CREDITS (epic, sprint 2 — besluit V4) ──────────────────────
-- 4 gratis per dag (niet opspaarbaar) + 2 bonustegoed per geplaatste
-- bestelling (wel opspaarbaar). Verbruik: eerst dag-tegoed, dan bonus.
-- Additief en veilig op live.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS visualisation_bonus_credits int NOT NULL DEFAULT 0;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS visualisation_bonus_granted boolean NOT NULL DEFAULT false;

-- Bonus-tegoed is gevoelig: gebruikers mogen het niet zelf ophogen
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
    NEW.visualisation_bonus_credits IS DISTINCT FROM OLD.visualisation_bonus_credits
  ) THEN
    RAISE EXCEPTION 'Niet toegestaan: gevoelige profielkolommen kunnen niet worden aangepast';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Claim: telt dag-verbruik (Amsterdamse dag), valt terug op bonustegoed,
-- maakt de log-rij aan. Atomisch en SECURITY DEFINER (bypassed trigger/RLS).
CREATE OR REPLACE FUNCTION public.claim_visualisation(p_scene_id text, p_configuration_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_today_used int;
  v_bonus int;
  v_id uuid;
  v_daily_limit constant int := 4;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Niet ingelogd';
  END IF;

  -- Rij-lock per gebruiker: parallelle claims kunnen anders allebei
  -- dezelfde dagstand lezen en samen over de limiet heen
  PERFORM 1 FROM profiles WHERE id = v_uid FOR UPDATE;

  SELECT count(*) INTO v_today_used
  FROM visualisations
  WHERE user_id = v_uid
    AND (created_at AT TIME ZONE 'Europe/Amsterdam')::date = (now() AT TIME ZONE 'Europe/Amsterdam')::date;

  SELECT COALESCE(visualisation_bonus_credits, 0) INTO v_bonus
  FROM profiles WHERE id = v_uid;

  IF v_today_used >= v_daily_limit THEN
    IF v_bonus <= 0 THEN
      RAISE EXCEPTION 'Geen visualisaties meer beschikbaar vandaag';
    END IF;
    PERFORM set_config('app.bypass_profile_guard', '1', true);
    UPDATE profiles SET visualisation_bonus_credits = visualisation_bonus_credits - 1
    WHERE id = v_uid;
    v_bonus := v_bonus - 1;
  END IF;

  INSERT INTO visualisations (user_id, configuration_id, scene_id, image_path)
  VALUES (v_uid, p_configuration_id, p_scene_id, '')
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'id', v_id,
    'daily_used', LEAST(v_today_used + 1, v_daily_limit),
    'daily_limit', v_daily_limit,
    'bonus', v_bonus
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_visualisation FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_visualisation TO authenticated;

-- Bonus na bestelling: valideert dat de order echt, van de aanroeper en vers
-- is, en maar één keer tegoed geeft — niet te misbruiken zonder echte order.
CREATE OR REPLACE FUNCTION public.grant_order_visualisation_bonus(p_order_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_updated int;
  v_bonus int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Niet ingelogd';
  END IF;

  UPDATE orders SET visualisation_bonus_granted = true
  WHERE id = p_order_id
    AND user_id = v_uid
    AND visualisation_bonus_granted = false
    AND created_at > now() - interval '10 minutes';
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 1 THEN
    PERFORM set_config('app.bypass_profile_guard', '1', true);
    UPDATE profiles
    SET visualisation_bonus_credits = COALESCE(visualisation_bonus_credits, 0) + 2
    WHERE id = v_uid
    RETURNING visualisation_bonus_credits INTO v_bonus;
    RETURN v_bonus;
  END IF;

  SELECT COALESCE(visualisation_bonus_credits, 0) INTO v_bonus FROM profiles WHERE id = v_uid;
  RETURN v_bonus;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_order_visualisation_bonus FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_order_visualisation_bonus TO authenticated;

-- Status voor de modal-teller: zelfde dagdefinitie als claim_visualisation
CREATE OR REPLACE FUNCTION public.get_visualisation_status()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'daily_used', (
      SELECT count(*) FROM visualisations
      WHERE user_id = auth.uid()
        AND (created_at AT TIME ZONE 'Europe/Amsterdam')::date = (now() AT TIME ZONE 'Europe/Amsterdam')::date
    ),
    'daily_limit', 4,
    'bonus', (SELECT COALESCE(visualisation_bonus_credits, 0) FROM profiles WHERE id = auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.get_visualisation_status FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_visualisation_status TO authenticated;

COMMIT;
