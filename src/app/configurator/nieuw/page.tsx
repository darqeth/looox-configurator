import { createClient } from '@/lib/supabase/server'
import { getCompanyPriceSettings } from '@/lib/company-utils'
import ConfiguratorWizard from './configurator-wizard'

export const metadata = { title: 'Nieuwe spiegel — LoooX Configurator' }

export default async function NieuweConfiguratiePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let priceFactor = 1
  let priceFactorEnabled = false
  let canSeePurchasePrices = true
  let canOrder = true

  if (user) {
    const [{ data: profile }, { data: memberData }] = await Promise.all([
      supabase.from('profiles').select('company_id').eq('id', user.id).single(),
      supabase.from('company_members').select('role, can_see_purchase_prices, can_order').eq('user_id', user.id).maybeSingle(),
    ])

    const isManager = !memberData || memberData.role === 'manager'
    canSeePurchasePrices = isManager || (memberData?.can_see_purchase_prices ?? false)
    canOrder = isManager || (memberData?.can_order ?? true)

    ;({ priceFactor, priceFactorEnabled } = await getCompanyPriceSettings(supabase, profile?.company_id ?? null))
  }

  return (
    <ConfiguratorWizard
      priceFactor={priceFactor}
      priceFactorEnabled={priceFactorEnabled}
      canSeePurchasePrices={canSeePurchasePrices}
      canOrder={canOrder}
    />
  )
}
