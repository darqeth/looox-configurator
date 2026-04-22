import { createClient } from '@/lib/supabase/server'
import { isAdminOrSubAdmin } from '@/lib/company-utils'
import { redirect } from 'next/navigation'
import { AdminBestellingenList, type AdminOrder } from './admin-bestellingen-list'

const STATUS_LABELS: Record<string, string> = {
  pending:       'In behandeling',
  confirmed:     'Bevestigd',
  in_production: 'In productie',
  shipped:       'Verzonden',
  delivered:     'Geleverd',
  cancelled:     'Geannuleerd',
}

// Status volgorde voor sortering
const STATUS_ORDER: Record<string, number> = {
  confirmed: 0, pending: 1, in_production: 2, shipped: 3, delivered: 4, cancelled: 5,
}

export default async function AdminBestellingenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!await isAdminOrSubAdmin(supabase, user.id)) redirect('/dashboard')

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      quantity,
      unit_price,
      total_price,
      status,
      created_at,
      configurations(id, name, width, height, selected_options),
      profiles(id, full_name, company, email)
    `)
    .order('created_at', { ascending: false })

  const sorted = (orders ?? []).sort((a, b) => {
    const oa = STATUS_ORDER[a.status] ?? 99
    const ob = STATUS_ORDER[b.status] ?? 99
    if (oa !== ob) return oa - ob
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const statusCounts = (orders ?? []).reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, {})

  const activeCount = (statusCounts.pending ?? 0) + (statusCounts.confirmed ?? 0) + (statusCounts.in_production ?? 0)

  const mappedOrders: AdminOrder[] = sorted.map(o => ({
    id: o.id,
    order_number: o.order_number,
    quantity: o.quantity,
    unit_price: o.unit_price,
    total_price: o.total_price,
    status: o.status,
    created_at: o.created_at,
    config: (Array.isArray(o.configurations) ? o.configurations[0] : o.configurations) as AdminOrder['config'],
    profile: (Array.isArray(o.profiles) ? o.profiles[0] : o.profiles) as AdminOrder['profile'],
  }))

  return (
    <div className="p-4 sm:p-6 lg:p-7 w-full">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-lx-text-primary tracking-tight">Bestellingen</h1>
        <p className="text-lx-text-secondary text-[13px] mt-1">
          {activeCount > 0
            ? <><span className="text-amber-600 font-medium">{activeCount} actief</span> · {(orders ?? []).length} totaal</>
            : `${(orders ?? []).length} bestellingen`}
        </p>
      </div>

      {/* Status overzicht */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
        {(['pending', 'confirmed', 'in_production', 'shipped', 'delivered', 'cancelled'] as const).map(s => (
          <div key={s} className="bg-white rounded-[14px] border border-black/6 shadow-sm px-3 py-2.5 text-center">
            <p className="text-[18px] font-bold text-lx-text-primary">{statusCounts[s] ?? 0}</p>
            <p className="text-[10.5px] text-lx-text-secondary mt-0.5 leading-tight">{STATUS_LABELS[s]}</p>
          </div>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white rounded-[18px] border border-black/6 shadow-sm px-5 py-16 text-center">
          <p className="text-[14px] font-semibold text-lx-text-primary mb-1">Nog geen bestellingen</p>
          <p className="text-[13px] text-lx-text-secondary">Bestellingen verschijnen hier zodra dealers bestellen.</p>
        </div>
      ) : (
        <AdminBestellingenList orders={mappedOrders} />
      )}
    </div>
  )
}
