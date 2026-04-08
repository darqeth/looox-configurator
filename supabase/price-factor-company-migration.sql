-- LoooX Configurator — Prijsfactor naar companies tabel
-- Run eenmalig in Supabase Dashboard → SQL Editor

-- Voeg price_factor kolommen toe aan companies
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS price_factor         NUMERIC(4,2) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS price_factor_enabled BOOLEAN NOT NULL DEFAULT false;

-- Backfill: pak de waarden van de (eerste) manager per bedrijf
UPDATE companies c
SET
  price_factor = COALESCE(
    (SELECT p.price_factor
     FROM profiles p
     JOIN company_members cm ON cm.user_id = p.id
     WHERE cm.company_id = c.id AND cm.role = 'manager'
     ORDER BY cm.created_at
     LIMIT 1),
    1
  ),
  price_factor_enabled = COALESCE(
    (SELECT p.price_factor_enabled
     FROM profiles p
     JOIN company_members cm ON cm.user_id = p.id
     WHERE cm.company_id = c.id AND cm.role = 'manager'
     ORDER BY cm.created_at
     LIMIT 1),
    false
  );
