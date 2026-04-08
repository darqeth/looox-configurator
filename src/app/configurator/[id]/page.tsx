import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ConfiguratorWizard from '../nieuw/configurator-wizard'
import { LightConfig } from '../nieuw/step-verlichting'
import { ShapeSlug, GlasKleur } from '@/lib/configurator-config'

export default async function EditConfiguratorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: config, error }, { data: profile }, { data: memberData }] = await Promise.all([
    supabase.from('configurations').select('id, name, width, height, selected_options, status').eq('id', id).single(),
    supabase.from('profiles').select('company_id').eq('id', user.id).single(),
    supabase.from('company_members').select('role, can_see_purchase_prices, can_order').eq('user_id', user.id).maybeSingle(),
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
  const canSeePurchasePrices = isManager || (memberData?.can_see_purchase_prices ?? false)
  const canOrder = isManager || (memberData?.can_order ?? true)

  let priceFactor = 1
  let priceFactorEnabled = false
  if (profile?.company_id) {
    const { data: company } = await supabase
      .from('companies')
      .select('price_factor, price_factor_enabled')
      .eq('id', profile.company_id)
      .single()
    priceFactor = Number(company?.price_factor ?? 1)
    priceFactorEnabled = company?.price_factor_enabled ?? false
  }

  return (
    <ConfiguratorWizard
      initialConfig={initialConfig}
      priceFactor={priceFactor}
      priceFactorEnabled={priceFactorEnabled}
      canSeePurchasePrices={canSeePurchasePrices}
      canOrder={canOrder}
    />
  )
}
