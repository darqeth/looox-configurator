import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ConfiguratorWizard from '../nieuw/configurator-wizard'
import ProjectspiegelConfigurator from '../nieuw/projectspiegel/index'
import { LightConfig } from '../nieuw/step-verlichting'
import { ShapeSlug, GlasKleur } from '@/lib/configurator-config'

export default async function EditConfiguratorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: config, error }, { data: profile }, { data: memberData }] = await Promise.all([
    supabase.from('configurations').select('id, name, width, height, selected_options, status').eq('id', id).single(),
    supabase.from('profiles').select('korting, is_international, is_groothandel').eq('id', user.id).single(),
    supabase.from('company_members').select('role, can_order').eq('user_id', user.id).maybeSingle(),
  ])

  if (error || !config) notFound()

  // Bestelde configuraties zijn niet bewerkbaar
  if (config.status === 'ordered') redirect('/configuraties')

  const opts = config.selected_options as Record<string, unknown>

  const initialConfig = {
    id: config.id,
    shape: (opts.shape as ShapeSlug) ?? 'rechthoek',
    glasKleur: (opts.glasKleur as GlasKleur) ?? 'helder',
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

  const isManager = !memberData || memberData.role === 'manager'
  const canOrder = isManager || (memberData?.can_order ?? true)
  const korting = profile?.korting ?? 50
  const isInternational = profile?.is_international ?? false
  const isGroothandel = profile?.is_groothandel ?? false

  if (isGroothandel) {
    return (
      <ProjectspiegelConfigurator
        initialConfig={{
          id: config.id,
          lengte: config.width ?? 120,
          hoogte: config.height ?? 80,
          glasdikte: ((opts.glasdikte as '4' | '5' | '6') ?? '5'),
          ophanging: (opts.ophanging as boolean) ?? true,
          voormonteren: (opts.voormonteren as boolean) ?? true,
          verpakkingPerStuk: (opts.verpakkingPerStuk as boolean) ?? true,
          quantity: (opts.quantity as number) ?? 1,
          projectName: config.name ?? '',
          reference: (opts.reference as string) ?? '',
        }}
      />
    )
  }

  return (
    <ConfiguratorWizard
      initialConfig={initialConfig}
      korting={korting}
      canOrder={canOrder}
      isInternational={isInternational}
    />
  )
}
