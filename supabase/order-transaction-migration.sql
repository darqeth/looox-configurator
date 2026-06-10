-- ─── ORDER-TRANSACTIE + RATE-LIMIT MIGRATION (audit C5, S9) ─────────────────
-- 1. create_order_atomic(): config-insert/-update + order-insert + discount-
--    claim in één transactie. Faalt één stap (bv. kortingscode al gebruikt),
--    dan wordt álles teruggedraaid — geen orphan-configs of "korting verrekend
--    maar order geweigerd" meer.
--    SECURITY INVOKER: RLS-policies van de aanroepende gebruiker blijven
--    volledig gelden (insert eigen config, update eigen/collega-config, etc.).
-- 2. check_rate_limit(): simpele teller per sleutel voor AI-intake en
--    password-reset (fail-open in de app als deze functie ontbreekt).

BEGIN;

CREATE OR REPLACE FUNCTION public.create_order_atomic(
  p_config_id uuid,          -- bestaande config (bestellen vanaf lijst); null bij nieuwe
  p_new_config jsonb,        -- nieuwe config-rij (wizard-bestelling); null bij bestaande
  p_config_patch jsonb,      -- selected_options-patch bij bestaande config (of null)
  p_quantity int,
  p_unit_price numeric,
  p_total_price numeric,
  p_notes text,
  p_discount_code_id uuid,   -- null = geen kortingscode
  p_discount_use_type text   -- 'single' | 'per_user'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_config_id uuid := p_config_id;
  v_order_id uuid;
  v_order_number text;
  v_attempt int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Niet ingelogd';
  END IF;

  -- Stap 1: configuratie aanmaken (wizard) of op 'ordered' zetten (lijst)
  IF p_new_config IS NOT NULL THEN
    INSERT INTO configurations (user_id, product_id, name, width, height, selected_options, total_price, status)
    VALUES (
      v_uid,
      (p_new_config->>'product_id')::uuid,
      p_new_config->>'name',
      (p_new_config->>'width')::int,
      (p_new_config->>'height')::int,
      p_new_config->'selected_options',
      (p_new_config->>'total_price')::numeric,
      'ordered'
    )
    RETURNING id INTO v_config_id;
  ELSE
    UPDATE configurations SET
      status = 'ordered',
      selected_options = CASE
        WHEN p_config_patch IS NOT NULL THEN selected_options || p_config_patch
        ELSE selected_options
      END
    WHERE id = v_config_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Configuratie niet gevonden of geen rechten';
    END IF;
  END IF;

  -- Stap 2: order aanmaken met retry op ordernummer-conflict
  FOR v_attempt IN 1..5 LOOP
    v_order_number := next_order_number();
    BEGIN
      INSERT INTO orders (configuration_id, user_id, order_number, quantity, unit_price, total_price, notes, status)
      VALUES (v_config_id, v_uid, v_order_number, p_quantity, p_unit_price, p_total_price, NULLIF(p_notes, ''), 'pending')
      RETURNING id INTO v_order_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt = 5 THEN RAISE; END IF;
    END;
  END LOOP;

  -- Stap 3: kortingscode claimen — faalt dit, dan rolt de hele order terug
  IF p_discount_code_id IS NOT NULL THEN
    IF p_discount_use_type = 'per_user' THEN
      BEGIN
        INSERT INTO discount_code_uses (code_id, user_id, order_id)
        VALUES (p_discount_code_id, v_uid, v_order_id);
      EXCEPTION WHEN unique_violation THEN
        RAISE EXCEPTION 'Kortingscode is al gebruikt';
      END;
    ELSE
      IF NOT use_discount_code_atomic(p_discount_code_id, v_order_id) THEN
        RAISE EXCEPTION 'Kortingscode is al gebruikt';
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'config_id', v_config_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_atomic FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order_atomic TO authenticated;

-- ─── Rate limiting ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key text PRIMARY KEY,
  count int NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- Geen policies: alleen benaderbaar via de SECURITY DEFINER functie hieronder.

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text, p_max int, p_window_seconds int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  INSERT INTO rate_limits AS rl (key, count, window_start)
  VALUES (p_key, 1, now())
  ON CONFLICT (key) DO UPDATE SET
    count = CASE
      WHEN rl.window_start < now() - make_interval(secs => p_window_seconds) THEN 1
      ELSE rl.count + 1
    END,
    window_start = CASE
      WHEN rl.window_start < now() - make_interval(secs => p_window_seconds) THEN now()
      ELSE rl.window_start
    END
  RETURNING count INTO v_count;
  RETURN v_count <= p_max;
END;
$$;

-- Password-reset draait als anon (niet ingelogd) → anon heeft execute nodig
REVOKE ALL ON FUNCTION public.check_rate_limit FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO authenticated, anon;

COMMIT;
