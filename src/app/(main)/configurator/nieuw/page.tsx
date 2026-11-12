import { createClient } from '@/lib/supabase/server'
import ConfiguratorWizard from './configurator-wizard'
import ProjectspiegelConfigurator from './projectspiegel/index'
import { ConfiguratorTypeChooser } from './type-selector'
import { getExtraOptionTooltips, getControlTooltips } from '@/lib/actions/admin'
import { parseConfiguratorAccess } from '@/lib/configurator-access'
import { hasMeubelAccess } from '@/lib/meubel-access'

export const metadata = { title: 'Nieuwe spiegel — LoooX Configurator' }

export default async function NieuweConfiguratiePage() {
  const supabase = await createClient()
  // Leespad: lokale JWT-verificatie (middleware bewaakt de sessie, RLS de data)
  const { data: claimsData } = await supabase.auth.getClaims()
  const user = claimsData?.claims?.sub ? { id: claimsData.claims.sub } : null

  let korting = 50
  let canOrder = true
  let isInternational = false
  let access: ReturnType<typeof parseConfiguratorAccess> = 'maatwerk'

  const [
    optionTooltips,
    controlTooltips,
    profileResult,
    memberResult,
    meubel,
  ] = await Promise.all([
    getExtraOptionTooltips(),
    getControlTooltips(),
    user ? supabase.from('profiles').select('is_international, configurator_access, korting').eq('id', user.id).single() : Promise.resolve({ data: null }),
    user ? supabase.from('company_members').select('role, can_order').eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
    user ? hasMeubelAccess(supabase, user.id) : Promise.resolve(false),
  ])

  if (user) {
    const profile = profileResult.data
    const memberData = memberResult.data
    // can_order is leidend, ook voor een manager; geen member-rij = mag bestellen
    canOrder = memberData ? (memberData.can_order ?? true) : true
    isInternational = profile?.is_international ?? false
    access = parseConfiguratorAccess((profile as { configurator_access?: string | null } | null)?.configurator_access)
    korting = profile?.korting ?? 50
  }

  if (access === 'project') {
    // Met meubeltoegang eerst kiezen tussen projectspiegel en meubel
    if (meubel) return <ConfiguratorTypeChooser project={<ProjectspiegelConfigurator />} meubel />
    return <ProjectspiegelConfigurator />
  }

  const wizard = (
    <ConfiguratorWizard
      korting={korting}
      canOrder={canOrder}
      isInternational={isInternational}
      optionTooltips={optionTooltips}
      controlTooltips={controlTooltips}
    />
  )

  // 'beide': eerst typekeuze (besluit B2); maatwerk-stand direct de wizard
  if (access === 'beide') {
    return <ConfiguratorTypeChooser wizard={wizard} project={<ProjectspiegelConfigurator />} meubel={meubel} />
  }
  if (meubel) return <ConfiguratorTypeChooser wizard={wizard} meubel />

  return wizard
}
