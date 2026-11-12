-- ─── CONFIGURATOR 2.0: projecten (winkelmandje) ─────────────────────────────
-- Run eenmalig in Supabase Dashboard → SQL Editor.
-- Additief en veilig op live: de huidige productiecode leest deze kolommen niet
-- en bestaande configuraties en orders (project_id / order_group = NULL) werken
-- precies zoals voorheen.
--
-- Een project is geen eigen tabel: het is een gedeeld id op de configuraties die
-- samen één offerte en één bestelling vormen. Zo gelden de bestaande rechten op
-- configuraties en orders vanzelf ook voor projecten.
--   configurations.project_id → regels die bij elkaar horen (NULL = losse configuratie)
--   orders.order_group        → orderregels die samen besteld zijn; het gedeelde
--                               ordernummer (ORD-2026-0102), de regels heten -1, -2, …

BEGIN;

ALTER TABLE public.configurations
  ADD COLUMN IF NOT EXISTS project_id uuid;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_group text;

CREATE INDEX IF NOT EXISTS idx_configurations_project_id
  ON public.configurations (project_id) WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_order_group
  ON public.orders (order_group) WHERE order_group IS NOT NULL;

-- Bestelt alle regels van een project in één transactie onder één ordernummer.
-- De server (placeProjectOrder) rekent de prijzen uit en geeft ze per regel mee;
-- deze functie legt alleen vast. SECURITY INVOKER: de bestaande RLS op
-- configurations en orders bepaalt wat de aanroeper mag.
CREATE OR REPLACE FUNCTION public.create_project_order_atomic(
  p_project_id uuid,
  p_lines jsonb,             -- [{config_id, quantity, unit_price, total_price, config_patch}]
  p_notes text,
  p_is_offerte boolean DEFAULT false  -- true als alle regels op aanvraag zijn → OFF-nummer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_group text;
  v_line jsonb;
  v_idx int := 0;
  v_order_id uuid;
  v_order_number text;
  v_orders jsonb := '[]'::jsonb;
  v_attempt int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Niet ingelogd';
  END IF;
  IF p_project_id IS NULL OR p_lines IS NULL OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'Project heeft geen regels';
  END IF;

  -- Eén nummer voor het hele project; opnieuw proberen als de eerste regel botst
  FOR v_attempt IN 1..5 LOOP
    v_group := CASE WHEN p_is_offerte THEN next_offerte_number() ELSE next_order_number() END;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM orders WHERE order_group = v_group OR order_number = v_group OR order_number = v_group || '-1'
    );
    IF v_attempt = 5 THEN
      RAISE EXCEPTION 'Geen vrij ordernummer gevonden';
    END IF;
  END LOOP;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    v_idx := v_idx + 1;

    -- Alleen opgeslagen regels van dit project; al bestelde regels blokkeren de hele order
    UPDATE configurations SET
      status = 'ordered',
      selected_options = CASE
        WHEN v_line->'config_patch' IS NOT NULL AND jsonb_typeof(v_line->'config_patch') = 'object'
          THEN selected_options || (v_line->'config_patch')
        ELSE selected_options
      END
    WHERE id = (v_line->>'config_id')::uuid
      AND project_id = p_project_id
      AND status = 'saved';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Regel % hoort niet bij dit project, is al besteld of je hebt geen rechten', v_idx;
    END IF;

    v_order_number := v_group || '-' || v_idx;
    INSERT INTO orders (configuration_id, user_id, order_number, order_group, quantity, unit_price, total_price, notes, status)
    VALUES (
      (v_line->>'config_id')::uuid,
      v_uid,
      v_order_number,
      v_group,
      (v_line->>'quantity')::int,
      (v_line->>'unit_price')::numeric,
      (v_line->>'total_price')::numeric,
      NULLIF(p_notes, ''),
      'pending'
    )
    RETURNING id INTO v_order_id;

    v_orders := v_orders || jsonb_build_object(
      'order_id', v_order_id,
      'order_number', v_order_number,
      'config_id', v_line->>'config_id'
    );
  END LOOP;

  RETURN jsonb_build_object('order_group', v_group, 'orders', v_orders);
END;
$$;

REVOKE ALL ON FUNCTION public.create_project_order_atomic FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_project_order_atomic TO authenticated;

COMMIT;
