import { createClient } from '@/lib/supabase/server'
import ConfiguratorWizard from './configurator-wizard'
import ProjectspiegelConfigurator from './projectspiegel/index'
import { getExtraOptionTooltips } from '@/lib/actions/admin'

export const metadata = { title: 'Nieuwe spiegel — LoooX Configurator' }

export default async function NieuweConfiguratiePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let korting = 50
  let canSeePurchasePrices = true
  let canOrder = true
  let isInternational = false
  let isGroothandel = false

  const optionTooltips = await getExtraOptionTooltips()

  if (user) {
    const [{ data: profile }, { data: memberData }] = await Promise.all([
      supabase.from('profiles').select('is_international, is_groothandel, korting').eq('id', user.id).single(),
      supabase.from('company_members').select('role, can_see_purchase_prices, can_order').eq('user_id', user.id).maybeSingle(),
    ])

    const isManager = !memberData || memberData.role === 'manager'
    canSeePurchasePrices = isManager || (memberData?.can_see_purchase_prices ?? false)
    canOrder = isManager || (memberData?.can_order ?? true)
    isInternational = profile?.is_international ?? false
    isGroothandel = profile?.is_groothandel ?? false
    korting = profile?.korting ?? 50
  }

  if (isGroothandel) {
    return <ProjectspiegelConfigurator />
  }

  return (
    <ConfiguratorWizard
      korting={korting}
      canSeePurchasePrices={canSeePurchasePrices}
      canOrder={canOrder}
      isInternational={isInternational}
      optionTooltips={optionTooltips}
    />
  )
}
