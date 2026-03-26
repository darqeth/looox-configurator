-- Meerdere dealers kunnen één code gebruiken (elk 1x)
-- Run eenmalig in Supabase SQL Editor

-- 1. Voeg use_type toe aan discount_codes
ALTER TABLE discount_codes
  ADD COLUMN IF NOT EXISTS use_type TEXT NOT NULL DEFAULT 'single'
  CHECK (use_type IN ('single', 'per_user'));

-- 2. Tabel voor per-dealer gebruik tracking
CREATE TABLE IF NOT EXISTS discount_code_uses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id    UUID NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id   UUID REFERENCES orders(id) ON DELETE SET NULL,
  used_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (code_id, user_id)
);

ALTER TABLE discount_code_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gebruiker registreert eigen gebruik"
  ON discount_code_uses FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Gebruiker ziet eigen gebruik"
  ON discount_code_uses FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ));

CREATE POLICY "Alleen admins verwijderen gebruik"
  ON discount_code_uses FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ));
