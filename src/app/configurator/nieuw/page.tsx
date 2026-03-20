import { createClient } from '@/lib/supabase/server'
import ConfiguratorWizard from './configurator-wizard'

export const metadata = { title: 'Nieuwe spiegel — LoooX Configurator' }

export default async function NieuweConfiguratiePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let priceFactor = 1
  let priceFactorEnabled = false

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('price_factor, price_factor_enabled')
      .eq('id', user.id)
      .single()
    priceFactor = profile?.price_factor ?? 1
    priceFactorEnabled = profile?.price_factor_enabled ?? false
  }

  return <ConfiguratorWizard priceFactor={priceFactor} priceFactorEnabled={priceFactorEnabled} />
}
