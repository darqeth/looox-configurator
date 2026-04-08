-- LoooX Configurator — Collega's: permissies bij uitnodiging
-- Run eenmalig in Supabase Dashboard → SQL Editor

-- Voeg permissie-kolommen toe aan company_invites
-- Defaults komen overeen met "Standaard" preset (beperkt financieel, productief)
ALTER TABLE company_invites
  ADD COLUMN IF NOT EXISTS can_order               BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_see_purchase_prices BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_configure           BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS own_configs_only        BOOLEAN NOT NULL DEFAULT true;
