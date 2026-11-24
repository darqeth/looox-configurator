import { createClient } from '@/lib/supabase/server'
import { isAdminOrSubAdmin } from '@/lib/company-utils'
import { redirect } from 'next/navigation'
import { AdminConfiguratiesList, type AdminOrder, type BeheerItem } from './admin-configuraties-list'
import type { ConfigRow } from './config-detail-modal'
import { leesBeheerFilter } from '@/lib/beheer-filter'

// Offertes en bestellingen van dealers op één pagina. Een bestelling komt uit
// orders (met status, tekeningen en PDF's); een configuratie die nog niet besteld
// is komt uit configurations en kan het beheer op besteld zetten als de dealer
// via de groothandel heeft besteld.

export default async function AdminConfiguratiePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (!await isAdminOrSubAdmin(supabase, user.id)) redirect('/dashboard')

  const { status } = await searchParams

  const [{ data: orders }, { data: configs }] = await Promise.all([
    supabase
      .from('orders')
      .select(`
        id,
        order_number,
        order_group,
        quantity,
        unit_price,
        total_price,
        status,
        notes,
        created_at,
        configurations(id, name, article_number, width, height, selected_options),
        profiles(id, full_name, company, email)
      `)
      .order('created_at', { ascending: false })
      .limit(500), // TODO: pagination
    // Alle configuraties behalve die van de ingelogde beheerder
    supabase
      .from('configurations')
      .select(`
        id, name, article_number, total_price, status, created_at, updated_at,
        width, height, selected_options, project_id,
        profiles:user_id (full_name, company, email)
      `)
      .neq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(500), // TODO: pagination
  ])

  const orderItems: BeheerItem[] = (orders ?? []).map((o) => ({
    soort: 'order',
    order: {
      id: o.id,
      order_number: o.order_number,
      order_group: (o as { order_group?: string | null }).order_group ?? null,
      quantity: o.quantity,
      unit_price: o.unit_price,
      total_price: o.total_price,
      status: o.status,
      notes: (o as { notes?: string | null }).notes ?? null,
      created_at: o.created_at,
      config: (Array.isArray(o.configurations) ? o.configurations[0] : o.configurations) as AdminOrder['config'],
      profile: (Array.isArray(o.profiles) ? o.profiles[0] : o.profiles) as AdminOrder['profile'],
    },
  }))

  // Een configuratie met een order staat al als bestelling in de lijst
  const metOrder = new Set(orderItems.map((i) => (i.soort === 'order' ? i.order.config?.id : null)))
  const configItems: BeheerItem[] = (configs ?? [])
    .filter((c) => !metOrder.has(c.id))
    .map((c) => ({
      soort: 'config',
      config: {
        ...c,
        profiles: (Array.isArray(c.profiles) ? c.profiles[0] : c.profiles) as unknown as ConfigRow['profiles'],
      },
    }))

  const items = [...orderItems, ...configItems]
  const actief = orderItems.filter((i) => i.soort === 'order' && ['pending', 'confirmed', 'in_production'].includes(i.order.status)).length

  return (
    <div className="p-4 sm:p-6 lg:p-7 w-full">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-lx-text-primary tracking-tight">Configuraties</h1>
        <p className="text-lx-text-secondary text-[13px] mt-1">
          Offertes en bestellingen van dealers · {configItems.filter((i) => i.soort === 'config' && i.config.status !== 'ordered').length} niet besteld · {orderItems.length} besteld
          {actief > 0 && <> · <span className="text-amber-600 font-medium">{actief} actief</span></>}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-[18px] border border-black/6 shadow-sm px-5 py-16 text-center">
          <p className="text-[14px] font-semibold text-lx-text-primary mb-1">Nog geen configuraties</p>
          <p className="text-[13px] text-lx-text-secondary">Offertes en bestellingen verschijnen hier zodra dealers ze maken.</p>
        </div>
      ) : (
        <AdminConfiguratiesList key={leesBeheerFilter(status)} items={items} startFilter={leesBeheerFilter(status)} />
      )}
    </div>
  )
}
