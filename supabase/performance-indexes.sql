-- Performance indexes voor veelgebruikte FK kolommen
-- PostgreSQL indexeert FK kolommen NIET automatisch — alleen PK en UNIQUE.
-- Deze indexes versnellen: milestone shape scan, order history, RLS policy subqueries.

CREATE INDEX IF NOT EXISTS idx_configurations_user_id
  ON configurations(user_id);

CREATE INDEX IF NOT EXISTS idx_configurations_user_id_status
  ON configurations(user_id, status);

CREATE INDEX IF NOT EXISTS idx_orders_user_id
  ON orders(user_id);

CREATE INDEX IF NOT EXISTS idx_orders_user_id_created_at
  ON orders(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_company_members_company_id
  ON company_members(company_id);

CREATE INDEX IF NOT EXISTS idx_profiles_company_id
  ON profiles(company_id);

CREATE INDEX IF NOT EXISTS idx_user_milestones_user_id
  ON user_milestones(user_id);

CREATE INDEX IF NOT EXISTS idx_discount_codes_user_id
  ON discount_codes(user_id);
