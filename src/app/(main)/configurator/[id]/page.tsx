import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ConfiguratorWizard from '../nieuw/configurator-wizard'
import ProjectspiegelConfigurator from '../nieuw/projectspiegel/index'
import { LightConfig } from '../nieuw/step-verlichting'
import { ShapeSlug, GlasKleur } from '@/lib/configurator-config'
import MeubelConfigurator from '../meubel/meubel-configurator'
import { leesMeubel, isMeubelConfig } from '@/lib/meubel-opslag'
import { hasMeubelAccess, getMeubelFactor } from '@/lib/meubel-access'

export default async function EditConfiguratorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  // Leespad: lokale JWT-verificatie (middleware bewaakt de sessie, RLS de data)
  const { data: claimsData } = await supabase.auth.getClaims()
  const user = claimsData?.claims?.sub ? { id: claimsData.claims.sub } : null
  if (!user) redirect('/login')

  const [{ data: config, error }, { data: profile }, { data: memberData }] = await Promise.all([
    supabase.from('configurations').select('id, name, width, height, selected_options, status').eq('id', id).single(),
    supabase.from('profiles').select('korting, is_international, is_groothandel, configurator_access').eq('id', user.id).single(),
    supabase.from('company_members').select('role, can_order').eq('user_id', user.id).maybeSingle(),
  ])

  if (error || !config) notFound()

  // Bestelde configuraties zijn niet bewerkbaar
  if (config.status === 'ordered') redirect('/configuraties')

  const opts = config.selected_options as Record<string, unknown>

  // Meubel (configurator 2.0): eigen scherm, alleen met meubeltoegang
  if (isMeubelConfig(opts)) {
    const meubel = leesMeubel(opts)
    const [toegang, factor] = await Promise.all([
      hasMeubelAccess(supabase, user.id),
      getMeubelFactor(supabase, user.id),
    ])
    if (!meubel || !toegang) redirect('/configuraties')
    return (
      <MeubelConfigurator
        factor={factor}
        initialConfig={{
          id: config.id,
          modelId: meubel.model.id,
          lengte: meubel.lengte,
          lades: meubel.lades,
          ladeBreedtes: meubel.ladeBreedtes,
          houtkleur: meubel.houtkleur,
          opAanvraag: meubel.opAanvraag,
          hoogte: meubel.model.hoogte,
          logo: meubel.logo,
          uitsparingen: meubel.uitsparingen,
          attachmentUrl: meubel.attachmentUrl,
          quantity: meubel.quantity,
          projectName: config.name ?? '',
          reference: meubel.reference,
          description: meubel.description,
        }}
      />
    )
  }

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
    mmsQuantity: (opts.mmsQuantity as number | undefined) ?? 0,
    // Sol/Luna-velden: zonder deze vallen ze bij bewerken stil terug op
    // defaults en klopt de prijs na heropslaan niet meer (audit U2)
    solMeubelHoogte: (opts.solMeubelHoogte as number | undefined) ?? undefined,
    solOnderkant: (opts.solOnderkant as number | undefined) ?? undefined,
    lunaMeubelHoogte: (opts.lunaMeubelHoogte as number | undefined) ?? undefined,
    lunaOnderkant: (opts.lunaOnderkant as number | undefined) ?? undefined,
    lunaAfstand: (opts.lunaAfstand as number | undefined) ?? undefined,
    lunaMuurZijde: (opts.lunaMuurZijde as 'links' | 'rechts' | undefined) ?? undefined,
    attachmentUrl: (opts.attachmentUrl as string | null) ?? null,
  }

  // can_order is leidend, ook voor een manager; geen member-rij = mag bestellen
  const canOrder = memberData ? (memberData.can_order ?? true) : true
  const korting = profile?.korting ?? 50
  const isInternational = profile?.is_international ?? false
  // Routeren op het TYPE van de configuratie, niet op de accountstand —
  // een 'beide'-account moet beide typen kunnen bewerken (sprint 2)
  const isProjectConfig = (opts.shape as string | undefined) === 'projectspiegel'

  if (isProjectConfig) {
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
