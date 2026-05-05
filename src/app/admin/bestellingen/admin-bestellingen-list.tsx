'use client'

import { useState, useMemo, useEffect } from 'react'
import { OrderStatusSelect } from './order-status-row'
import { AdminPagination } from '@/components/admin-pagination'

const PAGE_SIZE = 20

const STATUS_LABELS: Record<string, string> = {
  pending:          'In behandeling',
  confirmed:        'Bevestigd',
  controle_vereist: 'Controle vereist',
  goedgekeurd:      'Goedgekeurd',
  afgekeurd:        'Afgekeurd',
  in_production:    'In productie',
  shipped:          'Verzonden',
  delivered:        'Geleverd',
  cancelled:        'Geannuleerd',
}

function ShapeIcon({ shape }: { shape: string }) {
  if (shape === 'rond') return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="2"><circle cx="12" cy="12" r="9"/></svg>
  if (shape === 'organic') return <svg width="15" height="15" viewBox="0 0 200 200" fill="none" stroke="var(--lx-cta)" strokeWidth="16"><path d="M97.8,156.3c-2.7.7-5.4,1.3-8.2,1.1s-1.6-.1-2.2-.3c-3.6-.9-7-1.8-10.2-3.9-22.6-14.7-38.4-35.2-49.6-59.6-9.1-20-8.5-45.1,11.5-56.1s23.8-6.8,36.6-6c27.2,1.8,53.5,9.3,77.2,22.5s22.1,16.3,24.3,28.6c.8,4.4-.7,9.4-.7,9.4-2.6,8.3-7.1,15.4-12.4,22.3-10.1,13-22.9,21.9-37.3,30.2-5.4,3.1-20.8,9.5-29,11.7Z"/></svg>
  if (shape === 'sol') return <svg width="15" height="15" viewBox="170 140 660 660"><path fill="var(--lx-cta)" fillRule="evenodd" d="M507.4,176.3c40.6,0,80,8,117.1,23.6,35.8,15.2,68,36.9,95.7,64.5,27.6,27.6,49.3,59.8,64.5,95.7,15.7,37.1,23.6,76.5,23.6,117.1s-.2,12.9-.6,19.3c-.2,3.3-3,5.9-6.3,5.9H213.4c-3.3,0-6.1-2.6-6.3-5.9-.4-6.4-.6-12.9-.6-19.3,0-40.6,8-80,23.6-117.1,15.2-35.8,36.9-68,64.5-95.7,27.6-27.6,59.8-49.3,95.7-64.5,37.1-15.7,76.5-23.6,117.1-23.6M507.4,159.3c-175.6,0-318,142.4-318,318s.2,13.6.7,20.4c.8,12.3,11,21.8,23.3,21.8h588c12.3,0,22.5-9.5,23.3-21.8.4-6.7.7-13.5.7-20.4,0-175.6-142.4-318-318-318h0Z"/><path fill="var(--lx-cta)" fillRule="evenodd" d="M713.2,681.8c3.7,0,5.3,2.5,5.9,4,.6,1.5,1.2,4.3-1.4,6.9-56.5,55.2-131.2,85.6-210.2,85.6s-153.6-30.4-210.2-85.6c-2.6-2.6-2-5.4-1.4-6.9.6-1.5,2.2-4,5.9-4h411.4M713.2,664.8h-411.4c-20.9,0-31.3,25.4-16.3,40.1,57.3,55.9,135.6,90.4,222.1,90.4s164.7-34.5,222.1-90.4c15-14.6,4.6-40.1-16.3-40.1h0Z"/></svg>
  if (shape === 'luna') return <svg width="15" height="15" viewBox="78 139 676 676"><path fill="var(--lx-cta)" d="M642.9,189.6c-4.9-2.3-9.9-4.5-15-6.6-37.2-15.2-77.9-23.7-120.5-23.7-175.6,0-318,142.4-318,318l.7,20.4c.8,12.3,11,21.8,23.3,21.8h426c4.6,0,8.4-3.8,8.4-8.4V197.2c0-3.3-1.9-6.2-4.8-7.6ZM627.9,502.4H213.4c-3.3,0-6.1-2.6-6.3-5.9-.4-6.4-.6-12.9-.6-19.3,0-40.6,8-80,23.6-117.1,15.2-35.8,36.9-68,64.5-95.7,27.6-27.6,59.8-49.3,95.7-64.5,37.1-15.7,76.5-23.6,117.1-23.6s80,8,117.1,23.6c1.1.5,2.3,1,3.4,1.5v301Z"/><path fill="var(--lx-cta)" d="M639.4,664.8h-337.6c-20.9,0-31.3,25.4-16.3,40.1,57.3,55.9,135.6,90.4,222.1,90.4s83.2-8.4,120.3-23.6c5.1-2.1,10.1-4.3,15-6.6,3-1.4,4.8-4.4,4.8-7.6v-84.3c0-4.6-3.8-8.4-8.4-8.4ZM627.9,753.3c-37.5,16.4-78.4,25-120.4,25-79,0-153.6-30.4-210.2-85.6-2.6-2.6-2-5.4-1.4-6.9.6-1.5,2.2-4,5.9-4h326.1v71.5Z"/></svg>
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="1.5"/></svg>
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export type AdminOrder = {
  id: string
  order_number: string
  quantity: number
  unit_price: number
  total_price: number
  status: string
  created_at: string
  config: { id: string; name: string | null; width: number | null; height: number | null; selected_options: Record<string, unknown> } | null
  profile: { full_name: string | null; company: string | null; email: string | null } | null
}

export function AdminBestellingenList({ orders }: { orders: AdminOrder[] }) {
  const [query, setQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return orders
    return orders.filter(o => {
      const orderNum = o.order_number.toLowerCase()
      const company = (o.profile?.company ?? '').toLowerCase()
      const name = (o.profile?.full_name ?? '').toLowerCase()
      const email = (o.profile?.email ?? '').toLowerCase()
      const configName = (o.config?.name ?? '').toLowerCase()
      const status = STATUS_LABELS[o.status]?.toLowerCase() ?? ''
      return orderNum.includes(q) || company.includes(q) || name.includes(q) || email.includes(q) || configName.includes(q) || status.includes(q)
    })
  }, [orders, query])

  useEffect(() => { setCurrentPage(1) }, [query])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pagedOrders = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <>
      {/* Zoekveld */}
      <div className="relative mb-4">
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--lx-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Zoek op ordernummer, dealer, bedrijf of configuratie…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-black/10 bg-white text-[13px] text-lx-text-primary placeholder:text-lx-placeholder focus:outline-none focus:ring-2 focus:ring-lx-cta/20 focus:border-lx-cta transition-colors shadow-sm"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute inset-y-0 right-3 flex items-center text-lx-text-secondary hover:text-lx-text-primary transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        )}
      </div>

      {/* Resultaat info */}
      {query && (
        <p className="text-[12px] text-lx-text-secondary mb-3">
          {filtered.length === 0
            ? 'Geen bestellingen gevonden'
            : `${filtered.length} van ${orders.length} bestellingen`}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-[18px] border border-black/6 shadow-sm px-5 py-12 text-center">
          <p className="text-[14px] font-semibold text-lx-text-primary mb-1">Geen resultaten</p>
          <p className="text-[13px] text-lx-text-secondary">Probeer een andere zoekterm.</p>
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
            {pagedOrders.map(order => {
              const shape = (order.config?.selected_options as { shape?: string })?.shape ?? 'rechthoek'
              const isProjectspiegel = shape === 'projectspiegel'
              return (
                <div key={order.id} className={`transition-colors ${isProjectspiegel ? 'border-l-[3px] border-l-violet-500 bg-violet-50/30 hover:bg-violet-50/50' : 'hover:bg-lx-panel-bg/40'}`}>
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
                      <p className="text-[12.5px] font-semibold text-lx-text-primary truncate">{order.profile?.company ?? order.profile?.full_name ?? '—'}</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-[11px] text-lx-text-secondary truncate">{order.config?.name ?? '—'} · {order.quantity}×</p>
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
                      <p className="text-[11px] text-lx-text-secondary mt-0.5">{formatDate(order.created_at)} · {order.config?.name ?? '—'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold text-lx-text-primary truncate">{order.profile?.company ?? '—'}</p>
                      <p className="text-[11px] text-lx-text-secondary mt-0.5 truncate">{order.profile?.full_name ?? order.profile?.email ?? '—'}</p>
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

      <AdminPagination
        currentPage={currentPage}
        totalPages={totalPages}
        total={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
      />
    </>
  )
}
