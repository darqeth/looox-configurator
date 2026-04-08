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

  if (user) {
    const [{ data: profile }, { data: memberData }] = await Promise.all([
      supabase.from('profiles').select('company_id').eq('id', user.id).single(),
      supabase.from('company_members').select('role, can_see_purchase_prices, can_order').eq('user_id', user.id).maybeSingle(),
    ])

    const isManager = !memberData || memberData.role === 'manager'
    canSeePurchasePrices = isManager || (memberData?.can_see_purchase_prices ?? false)
    canOrder = isManager || (memberData?.can_order ?? true)

    if (profile?.company_id) {
      const { data: company } = await supabase
        .from('companies')
        .select('price_factor, price_factor_enabled')
        .eq('id', profile.company_id)
        .single()
      priceFactor = Number(company?.price_factor ?? 1)
      priceFactorEnabled = company?.price_factor_enabled ?? false
    }
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
