import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/company-utils'
import { redirect } from 'next/navigation'
import { OrderStatusSelect } from './order-status-row'

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
  pending: 0, confirmed: 1, in_production: 2, shipped: 3, delivered: 4, cancelled: 5,
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ShapeIcon({ shape }: { shape: string }) {
  if (shape === 'rond') return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="2"><circle cx="12" cy="12" r="9"/></svg>
  if (shape === 'organic') return <svg width="14" height="14" viewBox="0 0 200 200" fill="none" stroke="var(--lx-cta)" strokeWidth="16"><path d="M97.8,156.3c-2.7.7-5.4,1.3-8.2,1.1s-1.6-.1-2.2-.3c-3.6-.9-7-1.8-10.2-3.9-22.6-14.7-38.4-35.2-49.6-59.6-9.1-20-8.5-45.1,11.5-56.1s23.8-6.8,36.6-6c27.2,1.8,53.5,9.3,77.2,22.5s22.1,16.3,24.3,28.6c.8,4.4-.7,9.4-.7,9.4-2.6,8.3-7.1,15.4-12.4,22.3-10.1,13-22.9,21.9-37.3,30.2-5.4,3.1-20.8,9.5-29,11.7Z"/></svg>
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="1.5"/></svg>
}

export default async function AdminBestellingenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!await isAdmin(supabase, user.id)) redirect('/dashboard')

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

  // Sorteer: actieve statussen eerst, dan op datum
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

      {/* Tabel */}
      {sorted.length === 0 ? (
        <div className="bg-white rounded-[18px] border border-black/6 shadow-sm px-5 py-16 text-center">
          <p className="text-[14px] font-semibold text-lx-text-primary mb-1">Nog geen bestellingen</p>
          <p className="text-[13px] text-lx-text-secondary">Bestellingen verschijnen hier zodra dealers bestellen.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden">
          {/* Header — desktop */}
          <div className="hidden lg:grid grid-cols-[36px_1fr_1fr_80px_96px_160px] gap-4 items-center px-5 py-2.5 border-b border-lx-divider bg-lx-panel-bg/60">
            <div />
            <div className="text-[10.5px] font-semibold text-lx-text-secondary uppercase tracking-wider">Order · Datum</div>
            <div className="text-[10.5px] font-semibold text-lx-text-secondary uppercase tracking-wider">Dealer</div>
            <div className="text-[10.5px] font-semibold text-lx-text-secondary uppercase tracking-wider text-center">Aantal</div>
            <div className="text-[10.5px] font-semibold text-lx-text-secondary uppercase tracking-wider text-right">Prijs</div>
            <div className="text-[10.5px] font-semibold text-lx-text-secondary uppercase tracking-wider text-center">Status</div>
          </div>

          <div className="divide-y divide-lx-divider">
            {sorted.map(order => {
              const config = (Array.isArray(order.configurations) ? order.configurations[0] : order.configurations) as {
                id: string; name: string | null; width: number | null; height: number | null
                selected_options: Record<string, unknown>
              } | null
              const profile = (Array.isArray(order.profiles) ? order.profiles[0] : order.profiles) as {
                full_name: string | null; company: string | null; email: string | null
              } | null
              const shape = (config?.selected_options as { shape?: string })?.shape ?? 'rechthoek'

              return (
                <div key={order.id} className="hover:bg-lx-panel-bg/40 transition-colors">
                  {/* Mobile */}
                  <div className="lg:hidden px-4 py-3.5 flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-lx-icon-bg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <ShapeIcon shape={shape} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <p className="text-[12.5px] font-bold text-lx-text-primary font-mono">{order.order_number}</p>
                          <p className="text-[11px] text-lx-text-secondary">{formatDate(order.created_at)}</p>
                        </div>
                        <OrderStatusSelect orderId={order.id} currentStatus={order.status} />
                      </div>
                      <p className="text-[12.5px] font-semibold text-lx-text-primary truncate">{profile?.company ?? profile?.full_name ?? '—'}</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-[11px] text-lx-text-secondary truncate">{config?.name ?? '—'} · {order.quantity}×</p>
                        <p className="text-[13px] font-bold text-lx-text-primary">€{Number(order.total_price).toLocaleString('nl-NL')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Desktop */}
                  <div className="hidden lg:grid grid-cols-[36px_1fr_1fr_80px_96px_160px] gap-4 items-center px-5 py-3.5">
                    <div className="w-8 h-8 rounded-xl bg-lx-icon-bg flex items-center justify-center">
                      <ShapeIcon shape={shape} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-bold text-lx-text-primary font-mono truncate">{order.order_number}</p>
                      <p className="text-[11px] text-lx-text-secondary mt-0.5">{formatDate(order.created_at)} · {config?.name ?? '—'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold text-lx-text-primary truncate">{profile?.company ?? '—'}</p>
                      <p className="text-[11px] text-lx-text-secondary mt-0.5 truncate">{profile?.full_name ?? profile?.email ?? '—'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[12.5px] font-medium text-lx-text-primary">{order.quantity}×</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-bold text-lx-text-primary">€{Number(order.total_price).toLocaleString('nl-NL')}</p>
                      {order.quantity > 1 && (
                        <p className="text-[10.5px] text-lx-text-secondary">€{Number(order.unit_price).toLocaleString('nl-NL')} p.st.</p>
                      )}
                    </div>
                    <div className="flex justify-center">
                      <OrderStatusSelect orderId={order.id} currentStatus={order.status} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
