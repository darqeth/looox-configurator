-- Notifications systeem — run eenmalig in Supabase SQL Editor

-- 1. Notifications tabel
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'feature', 'promo')),
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Read-tracker in profiles (één timestamp per gebruiker: alles vóór dit tijdstip = gelezen)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notifications_read_at TIMESTAMPTZ;

-- 3. RLS: iedereen mag lezen, alleen admins mogen schrijven
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Iedereen mag notifications lezen"
  ON notifications FOR SELECT
  USING (true);

CREATE POLICY "Alleen admins mogen notifications schrijven"
  ON notifications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 4. Seed met een eerste melding
INSERT INTO notifications (title, body, type, published_at) VALUES
(
  'Welkom in het nieuwe portaal',
  'Je kunt nu spiegels configureren, bestellingen plaatsen en je voortgang bijhouden in de LoooX Circle.',
  'feature',
  now()
);
