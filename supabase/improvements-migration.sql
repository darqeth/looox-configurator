-- ─── 1. Order number sequence ─────────────────────────────────────────────────
-- Replaces COUNT(*)+1 pattern to prevent duplicate order numbers under concurrent requests.

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

CREATE OR REPLACE FUNCTION next_order_number()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 'ORD-' || extract(year from now())::int::text || '-' || lpad(nextval('order_number_seq')::text, 4, '0');
$$;

-- ─── 2. UNIQUE constraint on user_milestones ──────────────────────────────────
-- Prevents duplicate milestone awards if checkAndAwardMilestones runs concurrently.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_milestones_user_milestone_unique'
  ) THEN
    ALTER TABLE user_milestones
      ADD CONSTRAINT user_milestones_user_milestone_unique UNIQUE (user_id, milestone_id);
  END IF;
END $$;

-- ─── 3. UNIQUE constraint on discount_code_uses ───────────────────────────────
-- Prevents a per_user code from being applied twice by the same dealer concurrently.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'discount_code_uses_user_code_unique'
  ) THEN
    ALTER TABLE discount_code_uses
      ADD CONSTRAINT discount_code_uses_user_code_unique UNIQUE (code_id, user_id);
  END IF;
END $$;

-- ─── 4. Sum order revenue RPC ─────────────────────────────────────────────────
-- Replaces fetching all order rows client-side to compute a sum.

CREATE OR REPLACE FUNCTION sum_order_revenue(p_user_id uuid)
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM(total_price::numeric), 0)
  FROM orders
  WHERE user_id = p_user_id;
$$;

-- ─── 5. Atomic discount code claim ────────────────────────────────────────────
-- Atomically marks a single-use code as used. Returns true if the claim succeeded,
-- false if the code was already used (race condition).

CREATE OR REPLACE FUNCTION use_discount_code_atomic(
  p_code_id uuid,
  p_order_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE discount_codes
  SET used_at = now(), used_on_order_id = p_order_id
  WHERE id = p_code_id AND used_at IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$;

-- ─── 6. Sync approval_status to auth.users.raw_app_meta_data ─────────────────
-- Adds approval_status to the Supabase user object so middleware can read it
-- from getUser() without a separate profiles query.

CREATE OR REPLACE FUNCTION public.sync_approval_status_to_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object('approval_status', NEW.approval_status)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_approval_status_trigger ON public.profiles;
CREATE TRIGGER sync_approval_status_trigger
AFTER INSERT OR UPDATE OF approval_status ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_approval_status_to_auth();

-- Backfill existing users
UPDATE auth.users u
SET raw_app_meta_data =
  COALESCE(raw_app_meta_data, '{}'::jsonb) ||
  jsonb_build_object('approval_status', p.approval_status)
FROM public.profiles p
WHERE u.id = p.id;
