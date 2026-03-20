import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = {
  pending:   'In behandeling',
  confirmed: 'Bevestigd',
  shipped:   'Verzonden',
  delivered: 'Geleverd',
  cancelled: 'Geannuleerd',
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA]',
  confirmed: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]',
  shipped:   'bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]',
  delivered: 'bg-[#F0F4F1] text-lx-cta border-[#A7C4B0]',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function BestellingenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      quantity,
      unit_price,
      total_price,
      status,
      notes,
      created_at,
      configurations (
        id,
        name,
        width,
        height,
        selected_options
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 sm:p-6 lg:p-7">
      <div className="mb-6">
        <h1 className="text-[20px] font-bold text-lx-text-primary tracking-tight">Bestellingen</h1>
        <p className="text-[13px] text-lx-text-secondary mt-0.5">Overzicht van je offerteaanvragen en bestellingen</p>
      </div>

      {!orders || orders.length === 0 ? (
        <div className="bg-white rounded-[18px] border border-black/6 shadow-sm px-5 py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-lx-panel-bg flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--lx-text-secondary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </div>
          <p className="text-[14px] font-semibold text-lx-text-primary mb-1">Nog geen bestellingen</p>
          <p className="text-[13px] text-lx-text-secondary mb-5 max-w-sm mx-auto leading-relaxed">
            Configureer een spiegel en vraag een offerte aan. Je bestellingen verschijnen hier.
          </p>
          <Link
            href="/configurator/nieuw"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-lx-cta text-white text-[13px] font-semibold hover:bg-lx-cta-hover transition-colors"
          >
            + Nieuwe spiegel configureren
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-[18px] border border-black/6 shadow-sm divide-y divide-lx-divider">
          {orders.map((order) => {
            const config = (Array.isArray(order.configurations)
              ? order.configurations[0]
              : order.configurations) as {
              id: string; name: string | null; width: number | null; height: number | null
              selected_options: Record<string, unknown>
            } | null
            const shape = (config?.selected_options as { shape?: string })?.shape ?? '—'
            const dims = config?.width && config?.height
              ? `${config.width} × ${config.height} cm`
              : shape === 'rond'
              ? `⌀ ${(config?.selected_options as { diameter?: number })?.diameter ?? '—'} cm`
              : '—'

            return (
              <div key={order.id} className="px-5 py-4 flex items-center gap-4 group">
                {/* Ordernummer + datum */}
                <div className="flex-shrink-0 w-36">
                  <p className="text-[13.5px] font-bold text-lx-text-primary font-mono tracking-wide">{order.order_number}</p>
                  <p className="text-[11.5px] text-lx-text-secondary mt-0.5">{formatDate(order.created_at)}</p>
                </div>

                {/* Projectnaam + afmeting */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-semibold text-lx-text-primary truncate">{config?.name ?? '—'}</p>
                  <p className="text-[12px] text-lx-text-secondary mt-0.5">{dims} · {order.quantity}×</p>
                </div>

                {/* Prijs */}
                <div className="hidden sm:block flex-shrink-0 text-right w-28">
                  <p className="text-[14px] font-bold text-lx-text-primary">
                    €{Number(order.total_price).toLocaleString('nl-NL')}
                  </p>
                  <p className="text-[11px] text-lx-text-secondary">
                    {order.quantity > 1 ? `€${Number(order.unit_price).toLocaleString('nl-NL')} p.st. · ` : ''}excl. BTW
                  </p>
                </div>

                {/* Status badge */}
                <div className="flex-shrink-0">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11.5px] font-semibold border ${STATUS_COLORS[order.status] ?? STATUS_COLORS.pending}`}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {orders && orders.length > 0 && (
        <div className="mt-5 flex justify-end">
          <Link
            href="/configurator/nieuw"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-lx-cta text-white text-[13px] font-semibold hover:bg-lx-cta-hover transition-colors"
          >
            + Nieuwe spiegel
          </Link>
        </div>
      )}
    </div>
  )
}
