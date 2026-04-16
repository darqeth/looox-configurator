import { createClient } from '@/lib/supabase/server'
import ConfiguratorWizard from './configurator-wizard'

export const metadata = { title: 'Nieuwe spiegel — LoooX Configurator' }

export default async function NieuweConfiguratiePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let priceFactor = 1
  let priceFactorEnabled = false
  let canSeePurchasePrices = true
  let canOrder = true
  let isInternational = false

  if (user) {
    const [{ data: profile }, { data: memberData }] = await Promise.all([
      supabase.from('profiles').select('is_international, price_factor, price_factor_enabled').eq('id', user.id).single(),
      supabase.from('company_members').select('role, can_see_purchase_prices, can_order').eq('user_id', user.id).maybeSingle(),
    ])

    const isManager = !memberData || memberData.role === 'manager'
    canSeePurchasePrices = isManager || (memberData?.can_see_purchase_prices ?? false)
    canOrder = isManager || (memberData?.can_order ?? true)
    isInternational = profile?.is_international ?? false
    priceFactor = profile?.price_factor ?? 1
    priceFactorEnabled = profile?.price_factor_enabled ?? false
  }

  return (
    <ConfiguratorWizard
      priceFactor={priceFactor}
      priceFactorEnabled={priceFactorEnabled}
      canSeePurchasePrices={canSeePurchasePrices}
      canOrder={canOrder}
      isInternational={isInternational}
    />
  )
}
