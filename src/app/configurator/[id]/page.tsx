import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ConfiguratorWizard from '../nieuw/configurator-wizard'
import { LightConfig } from '../nieuw/step-verlichting'
import { ShapeSlug } from '@/lib/configurator-config'

export default async function EditConfiguratorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: config, error } = await supabase
    .from('configurations')
    .select('id, name, width, height, selected_options, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !config) notFound()

  // Bestelde configuraties zijn niet bewerkbaar
  if (config.status === 'ordered') redirect('/configuraties')

  const opts = config.selected_options as Record<string, unknown>

  const initialConfig = {
    id: config.id,
    shape: (opts.shape as ShapeSlug) ?? 'rechthoek',
    width: config.width ?? 80,
    height: config.height ?? 60,
    diameter: (opts.diameter as number | null) ?? null,
    organicSizeKey: (opts.organicSizeKey as string | null) ?? null,
    directLight: (opts.directLight as LightConfig) ?? { position: 'geen', type: null, control: null },
    indirectLight: (opts.indirectLight as LightConfig) ?? { position: 'geen', type: null, control: null },
    selectedOptions: (opts.extras as string[]) ?? [],
    optionSubChoices: (opts.optionSubChoices as Record<string, string>) ?? {},
    projectName: config.name ?? '',
    reference: (opts.reference as string) ?? '',
    description: (opts.description as string) ?? '',
    quantity: (opts.quantity as number) ?? 1,
  }

  return <ConfiguratorWizard initialConfig={initialConfig} />
}
