'use client'

import { useState, useMemo, useEffect } from 'react'
import { OrderStatusSelect } from './order-status-row'
import { AdminPagination } from '@/components/admin-pagination'
import { OfferteBadge } from '@/components/project-badge'

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
  return <img src={`/icons/shapes/${shape}.svg`} width="15" height="15" alt="" />
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
              const isOpAanvraag = shape === 'op-aanvraag'
              const priceLabel = isOpAanvraag ? 'Op offerte' : `€${Number(order.total_price).toLocaleString('nl-NL')}`
              return (
                <div key={order.id} className={`transition-colors ${isProjectspiegel ? 'border-l-[3px] border-l-violet-500 bg-violet-50/30 hover:bg-violet-50/50' : isOpAanvraag ? 'border-l-[3px] border-l-amber-400 bg-amber-50/30 hover:bg-amber-50/50' : 'hover:bg-lx-panel-bg/40'}`}>
                  {/* Mobile */}
                  <div className="lg:hidden px-4 py-3.5 flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-lx-icon-bg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <ShapeIcon shape={shape} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <p className="text-[12.5px] font-bold text-lx-text-primary font-mono">{order.order_number}{isOpAanvraag && <OfferteBadge className="ml-1.5" />}</p>
                          <p className="text-[11px] text-lx-text-secondary">{formatDate(order.created_at)}</p>
                        </div>
                        <OrderStatusSelect orderId={order.id} currentStatus={order.status} />
                      </div>
                      <p className="text-[12.5px] font-semibold text-lx-text-primary truncate">{order.profile?.company ?? order.profile?.full_name ?? '—'}</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-[11px] text-lx-text-secondary truncate">{order.config?.name ?? '—'} · {order.quantity}×</p>
                        <p className="text-[13px] font-bold text-lx-text-primary">{priceLabel}</p>
                      </div>
                    </div>
                  </div>

                  {/* Desktop */}
                  <div className="hidden lg:grid grid-cols-[36px_1fr_1fr_80px_96px_160px] gap-4 items-center px-5 py-3.5">
                    <div className="w-8 h-8 rounded-xl bg-lx-icon-bg flex items-center justify-center">
                      <ShapeIcon shape={shape} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-bold text-lx-text-primary font-mono truncate">{order.order_number}{isOpAanvraag && <OfferteBadge className="ml-1.5" />}</p>
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
                      <p className="text-[13px] font-bold text-lx-text-primary">{priceLabel}</p>
                      {!isOpAanvraag && order.quantity > 1 && (
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
