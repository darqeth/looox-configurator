-- ─── BADKAMER-VISUALISATIE: log-tabel + storage (epic, sprint 1) ─────────────
-- Additief: live-app raakt dit nergens aan.

BEGIN;

CREATE TABLE IF NOT EXISTS public.visualisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  configuration_id uuid REFERENCES public.configurations(id) ON DELETE SET NULL,
  scene_id text NOT NULL,
  image_path text NOT NULL,
  in_pdf boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visualisations_user_day ON public.visualisations (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_visualisations_config ON public.visualisations (configuration_id);

ALTER TABLE public.visualisations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gebruiker ziet eigen visualisaties" ON public.visualisations
  FOR SELECT USING (user_id = auth.uid() OR (SELECT is_looox_admin()));
CREATE POLICY "Gebruiker maakt eigen visualisaties" ON public.visualisations
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Gebruiker wijzigt eigen visualisaties" ON public.visualisations
  FOR UPDATE USING (user_id = auth.uid());

COMMIT;
