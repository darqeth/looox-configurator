-- LoooX Configurator — Seed data
-- Uitvoeren in: Supabase Dashboard → SQL Editor

-- Standaard LoooX spiegel product (vaste UUID voor de configurator)
INSERT INTO products (id, name, slug, type, description, base_price, is_active, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'LoooX Spiegel',
  'looox-spiegel',
  'mirror',
  'Configureerbare maatwerk badkamerspiegel',
  149.00,
  true,
  1
) ON CONFLICT (id) DO NOTHING;
