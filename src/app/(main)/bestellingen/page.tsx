import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const PAGE_SIZE = 20

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

export default async function BestellingenPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { page } = await searchParams
  const currentPage = Math.max(1, parseInt(page ?? '1', 10) || 1)
  const from = (currentPage - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: orders, count } = await supabase
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
    `, { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(from, to)

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

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
              <div key={order.id} className="px-5 py-4 flex items-center gap-4">
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

                {/* Download knoppen */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {config && (
                    <div className="relative group">
                      <a
                        href={`/api/pdf/offerte/${config.id}`}
                        download
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-lx-text-secondary hover:text-lx-cta hover:bg-lx-panel-bg transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
                        </svg>
                      </a>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-lx-text-primary text-white text-[10.5px] font-medium rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        Klantofferte downloaden
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-lx-text-primary" />
                      </div>
                    </div>
                  )}
                  <div className="relative group">
                    <a
                      href={`/api/pdf/order/${order.id}`}
                      download
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-lx-text-secondary hover:text-lx-cta hover:bg-lx-panel-bg transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </a>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-lx-text-primary text-white text-[10.5px] font-medium rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      Orderbevestiging downloaden
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-lx-text-primary" />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Paginering + nieuwe spiegel */}
      <div className="mt-5 flex items-center justify-between gap-4">
        {totalPages > 1 ? (
          <div className="flex items-center gap-1">
            {currentPage > 1 && (
              <Link href={`/bestellingen?page=${currentPage - 1}`} className="px-3 py-1.5 rounded-lg border border-black/10 text-[12.5px] font-medium text-lx-text-secondary hover:bg-lx-panel-bg transition-colors">
                ← Vorige
              </Link>
            )}
            <span className="px-3 py-1.5 text-[12.5px] text-lx-text-secondary">
              {currentPage} / {totalPages}
            </span>
            {currentPage < totalPages && (
              <Link href={`/bestellingen?page=${currentPage + 1}`} className="px-3 py-1.5 rounded-lg border border-black/10 text-[12.5px] font-medium text-lx-text-secondary hover:bg-lx-panel-bg transition-colors">
                Volgende →
              </Link>
            )}
          </div>
        ) : <div />}

        {orders && orders.length > 0 && (
          <Link
            href="/configurator/nieuw"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-lx-cta text-white text-[13px] font-semibold hover:bg-lx-cta-hover transition-colors"
          >
            + Nieuwe spiegel
          </Link>
        )}
      </div>
    </div>
  )
}
