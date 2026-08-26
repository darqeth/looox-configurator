import { createClient } from '@/lib/supabase/server'
import ConfiguratorWizard from './configurator-wizard'
import ProjectspiegelConfigurator from './projectspiegel/index'
import { ConfiguratorTypeChooser } from './type-selector'
import { getExtraOptionTooltips, getControlTooltips } from '@/lib/actions/admin'
import { parseConfiguratorAccess } from '@/lib/configurator-access'

export const metadata = { title: 'Nieuwe spiegel — LoooX Configurator' }

export default async function NieuweConfiguratiePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let korting = 50
  let canOrder = true
  let isInternational = false
  let access: ReturnType<typeof parseConfiguratorAccess> = 'maatwerk'

  const [
    optionTooltips,
    controlTooltips,
    profileResult,
    memberResult,
  ] = await Promise.all([
    getExtraOptionTooltips(),
    getControlTooltips(),
    user ? supabase.from('profiles').select('is_international, configurator_access, korting').eq('id', user.id).single() : Promise.resolve({ data: null }),
    user ? supabase.from('company_members').select('role, can_order').eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
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
    return <ConfiguratorTypeChooser wizard={wizard} project={<ProjectspiegelConfigurator />} />
  }

  return wizard
}
