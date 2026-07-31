-- ─── APART OFFERTENUMMER VOOR SPIEGEL OP AANVRAAG ──────────────────────────────
-- Een spiegel "op aanvraag" is een offerteaanvraag, geen bestelling. Die krijgt
-- nu een eigen OFF-nummerreeks (OFF-JJJJ-NNNN) i.p.v. ORD-. create_order_atomic
-- krijgt een extra parameter p_is_offerte; bij true wordt next_offerte_number()
-- gebruikt. Additief: bestaande orders en de bestaande sequence blijven intact.

BEGIN;

-- Eigen teller voor offertes, los van order_number_seq
CREATE SEQUENCE IF NOT EXISTS offerte_number_seq;

CREATE OR REPLACE FUNCTION next_offerte_number()
RETURNS text
LANGUAGE sql
AS $$
  SELECT 'OFF-' || extract(year from now())::int::text || '-' || lpad(nextval('offerte_number_seq')::text, 4, '0');
$$;

-- Oude 9-argument-versie droppen zodat PostgREST niet tussen twee overloads
-- hoeft te kiezen (named-arg-ambiguïteit). Daarna de nieuwe 10-argument-versie.
DROP FUNCTION IF EXISTS public.create_order_atomic(uuid, jsonb, jsonb, int, numeric, numeric, text, uuid, text);

CREATE OR REPLACE FUNCTION public.create_order_atomic(
  p_config_id uuid,          -- bestaande config (bestellen vanaf lijst); null bij nieuwe
  p_new_config jsonb,        -- nieuwe config-rij (wizard-bestelling); null bij bestaande
  p_config_patch jsonb,      -- selected_options-patch bij bestaande config (of null)
  p_quantity int,
  p_unit_price numeric,
  p_total_price numeric,
  p_notes text,
  p_discount_code_id uuid,   -- null = geen kortingscode
  p_discount_use_type text,  -- 'single' | 'per_user'
  p_is_offerte boolean DEFAULT false  -- true bij spiegel op aanvraag → OFF-nummer
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

  -- Stap 2: order aanmaken met retry op nummer-conflict. Op aanvraag = OFF-nummer.
  FOR v_attempt IN 1..5 LOOP
    v_order_number := CASE WHEN p_is_offerte THEN next_offerte_number() ELSE next_order_number() END;
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

COMMIT;
