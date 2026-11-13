'use client'

import { leesMeubel } from '@/lib/meubel-opslag'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { OrderApprovalButtons } from './order-approval-buttons'
import { AdminPagination } from '@/components/admin-pagination'
import { fetchOrders } from '@/lib/queries/fetch-orders'
import { ProjectBadge, OfferteBadge } from '@/components/project-badge'
import { formatEuro } from '@/lib/mms'
import { BestellingenContentSkeleton } from './bestellingen-skeleton'
import { productIcoon } from '@/lib/product-icoon'

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

const STATUS_COLORS: Record<string, string> = {
  pending:          'bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA]',
  confirmed:        'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]',
  controle_vereist: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
  goedgekeurd:      'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]',
  afgekeurd:        'bg-red-50 text-red-600 border-red-200',
  in_production:    'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
  shipped:          'bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]',
  delivered:        'bg-[#F0F4F1] text-lx-cta border-[#A7C4B0]',
  cancelled:        'bg-red-50 text-red-600 border-red-200',
}

function ShapeIcon({ options }: { options: unknown }) {
  return <img src={productIcoon(options)} width="15" height="15" alt="" />
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function BestellingenContent({ page, view }: { page: string; view: string }) {
  const { data } = useQuery({
    queryKey: ['orders', { view, page }],
    queryFn: () => fetchOrders({ view, page: Number(page) }),
  })

  if (!data) return <BestellingenContentSkeleton />

  const { orders, count, totalPages, currentPage, isManager, teamMembers, validView, viewingName, ownCount } = data

  const memberTabs = isManager && teamMembers.length > 0 ? (
    <div className="flex flex-wrap gap-1 mb-3 bg-white rounded-xl p-1 border border-black/6 shadow-sm w-fit">
      <Link
        href="/bestellingen"
        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors ${
          !validView
            ? 'bg-lx-text-primary text-white'
            : 'text-lx-text-secondary hover:text-lx-text-primary hover:bg-lx-panel-bg'
        }`}
      >
        Mijn bestellingen
        {ownCount > 0 && (
          <span className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded-full ${
            !validView ? 'bg-white/20 text-white' : 'bg-lx-divider text-lx-text-secondary'
          }`}>{ownCount}</span>
        )}
      </Link>
      {teamMembers.map((m) => {
        const isActive = validView && view === m.userId
        const firstName = m.name.split(' ')[0]
        return (
          <Link
            key={m.userId}
            href={`/bestellingen?view=${m.userId}`}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors ${
              isActive
                ? 'bg-lx-text-primary text-white'
                : 'text-lx-text-secondary hover:text-lx-text-primary hover:bg-lx-panel-bg'
            }`}
          >
            {firstName}
            {m.count > 0 && (
              <span className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded-full ${
                isActive ? 'bg-white/20 text-white' : 'bg-lx-divider text-lx-text-secondary'
              }`}>{m.count}</span>
            )}
          </Link>
        )
      })}
    </div>
  ) : null

  if (!orders || orders.length === 0) {
    return (
      <>
        {memberTabs}
        <div className="bg-white rounded-[18px] border border-black/6 shadow-sm px-5 py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-lx-panel-bg flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--lx-text-secondary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </div>
          <p className="text-[14px] font-semibold text-lx-text-primary mb-1">
            {viewingName ? `${viewingName} heeft nog geen bestellingen` : 'Nog geen bestellingen'}
          </p>
          {!viewingName && (
            <>
              <p className="text-[13px] text-lx-text-secondary mb-5 max-w-sm mx-auto leading-relaxed">
                Configureer een spiegel en vraag een offerte aan. Je bestellingen verschijnen hier.
              </p>
              <Link
                href="/configurator/nieuw"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-lx-cta text-white text-[13px] font-semibold hover:bg-lx-cta-hover transition-colors"
              >
                + Nieuwe configuratie
              </Link>
            </>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      {memberTabs}
      <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden">

        {/* Column headers — tablet+ only */}
        <div className="hidden sm:flex items-center gap-4 px-5 py-2.5 border-b border-lx-divider bg-lx-panel-bg/60">
          <div className="w-9 flex-shrink-0" />
          <div className="w-[140px] flex-shrink-0 text-[10.5px] font-semibold text-lx-text-secondary uppercase tracking-wider">Bestelling</div>
          <div className="flex-1 min-w-0 text-[10.5px] font-semibold text-lx-text-secondary uppercase tracking-wider">Project</div>
          <div className="hidden lg:block w-10 flex-shrink-0 text-center text-[10.5px] font-semibold text-lx-text-secondary uppercase tracking-wider">Aantal</div>
          <div className="w-[92px] flex-shrink-0 text-right text-[10.5px] font-semibold text-lx-text-secondary uppercase tracking-wider">Prijs</div>
          <div className="w-[124px] flex-shrink-0 text-center text-[10.5px] font-semibold text-lx-text-secondary uppercase tracking-wider">Status</div>
          <div className="w-[60px] flex-shrink-0" />
        </div>

        <div className="divide-y divide-lx-divider">
          {orders.map((order, orderIndex) => {
            // Projectorder: kopregel met het gezamenlijke nummer boven de eerste regel
            const groep = order.order_group
            const groepRegels = groep ? orders.filter((o) => o.order_group === groep) : []
            const eersteVanGroep = !!groep && orders[orderIndex - 1]?.order_group !== groep
            const config = (Array.isArray(order.configurations)
              ? order.configurations[0]
              : order.configurations) as {
              id: string; name: string | null; width: number | null; height: number | null
              selected_options: Record<string, unknown>
            } | null
            const shape = (config?.selected_options as { shape?: string })?.shape ?? '—'
            const meubel = leesMeubel(config?.selected_options)
            const dims = meubel
              ? `${meubel.model.naam} · ${meubel.lengte} mm`
              : config?.width && config?.height
              ? `B ${config.width} × H ${config.height} cm`
              : shape === 'rond'
              ? `⌀ ${(config?.selected_options as { diameter?: number })?.diameter ?? '—'} cm`
              : '—'

            const price = Number(order.total_price)
            const unitPrice = Number(order.unit_price)
            const priceSubLabel = order.quantity > 1
              ? `€${unitPrice.toLocaleString('nl-NL')} p.st.`
              : meubel ? 'Netto ex. BTW' : 'Bruto ex. BTW'

            const drawings = (Array.isArray(order.order_drawings) ? order.order_drawings : []) as { file_url: string; file_name: string }[]

            return (
              <div key={order.id} className="hover:bg-lx-panel-bg/50 transition-colors">
                {eersteVanGroep && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 sm:px-5 py-2.5 bg-lx-icon-bg border-b border-lx-divider">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-white text-lx-cta">Project</span>
                    <span className="text-[12.5px] font-bold text-lx-text-primary font-mono tracking-wide">{groep}</span>
                    <span className="text-[12px] text-lx-text-secondary flex-1 min-w-0 truncate">
                      {groepRegels.length} {groepRegels.length === 1 ? 'regel' : 'regels'} · totaal {formatEuro(groepRegels.reduce((som, o) => som + Math.round(Number(o.total_price) * 100), 0) / 100)} netto
                    </span>
                    <a href={`/api/pdf/order/groep/${groep}`} download className="text-[12px] font-semibold text-lx-cta hover:underline whitespace-nowrap">
                      Projectorder downloaden
                    </a>
                  </div>
                )}

                {/* Mobile layout */}
                <div className="flex gap-3 px-4 py-3.5 sm:hidden">
                  <div className="w-9 h-9 rounded-xl bg-lx-icon-bg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ShapeIcon options={config?.selected_options} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[12.5px] font-bold text-lx-text-primary font-mono tracking-wide">{order.order_number}</p>
                        <p className="text-[11px] text-lx-text-secondary mt-0.5">{formatDate(order.created_at)}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10.5px] font-semibold border flex-shrink-0 mt-0.5 ${STATUS_COLORS[order.status] ?? STATUS_COLORS.pending}`}>
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </div>
                    <p className="text-[12.5px] font-semibold text-lx-text-primary mt-2 truncate">{config?.name ?? '—'}{shape === 'projectspiegel' && <ProjectBadge className="ml-1.5" />}{(shape === 'op-aanvraag' || meubel?.opAanvraag) && <OfferteBadge className="ml-1.5" />}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[11px] text-lx-text-secondary">{dims} · {order.quantity}×</span>
                      <span className="text-[13px] font-bold text-lx-text-primary">{shape === 'op-aanvraag' || meubel?.opAanvraag ? 'Op offerte' : formatEuro(price)}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1 mt-2.5">
                      {config && (
                        <a href={`/api/pdf/offerte/${config.id}`} download className="w-8 h-8 rounded-lg flex items-center justify-center text-lx-text-secondary hover:text-lx-cta hover:bg-lx-panel-bg transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
                          </svg>
                        </a>
                      )}
                      <a href={`/api/pdf/order/${order.id}`} download className="w-8 h-8 rounded-lg flex items-center justify-center text-lx-text-secondary hover:text-lx-cta hover:bg-lx-panel-bg transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Tablet / Desktop layout */}
                <div className="hidden sm:flex items-center gap-4 px-5 py-3.5">
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-xl bg-lx-icon-bg flex items-center justify-center flex-shrink-0">
                    <ShapeIcon options={config?.selected_options} />
                  </div>

                  {/* Col: Order number + date */}
                  <div className="w-[140px] flex-shrink-0 min-w-0">
                    <p className="text-[12.5px] font-bold text-lx-text-primary font-mono tracking-wide truncate">{order.order_number}</p>
                    <p className="text-[11px] text-lx-text-secondary mt-0.5">{formatDate(order.created_at)}</p>
                  </div>

                  {/* Col: Project name + dims */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-semibold text-lx-text-primary truncate">{config?.name ?? '—'}{shape === 'projectspiegel' && <ProjectBadge className="ml-1.5" />}{(shape === 'op-aanvraag' || meubel?.opAanvraag) && <OfferteBadge className="ml-1.5" />}</p>
                    <p className="text-[11px] text-lx-text-secondary mt-0.5 truncate">{dims}</p>
                  </div>

                  {/* Col: Qty — desktop only */}
                  <div className="hidden lg:block w-10 flex-shrink-0 text-center">
                    <p className="text-[12.5px] font-medium text-lx-text-primary">{order.quantity}×</p>
                  </div>

                  {/* Col: Price */}
                  <div className="w-[92px] flex-shrink-0 text-right">
                    <p className="text-[13px] font-bold text-lx-text-primary">{shape === 'op-aanvraag' || meubel?.opAanvraag ? 'Op offerte' : formatEuro(price)}</p>
                    {shape !== 'op-aanvraag' && <p className="text-[10.5px] text-lx-text-secondary mt-0.5">{priceSubLabel}</p>}
                  </div>

                  {/* Col: Status */}
                  <div className="w-[124px] flex-shrink-0 flex justify-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${STATUS_COLORS[order.status] ?? STATUS_COLORS.pending}`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </div>

                  {/* Col: Actions */}
                  <div className="w-[60px] flex-shrink-0 flex items-center gap-1 justify-end">
                    {config && (
                      <div className="relative group">
                        <a href={`/api/pdf/offerte/${config.id}`} download className="w-8 h-8 rounded-lg flex items-center justify-center text-lx-text-secondary hover:text-lx-cta hover:bg-lx-panel-bg transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
                          </svg>
                        </a>
                        <div className="absolute bottom-full right-0 mb-1.5 px-2 py-1 bg-lx-text-primary text-white text-[10.5px] font-medium rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          Klantofferte downloaden
                          <div className="absolute top-full right-2 border-4 border-transparent border-t-lx-text-primary" />
                        </div>
                      </div>
                    )}
                    <div className="relative group">
                      <a href={`/api/pdf/order/${order.id}`} download className="w-8 h-8 rounded-lg flex items-center justify-center text-lx-text-secondary hover:text-lx-cta hover:bg-lx-panel-bg transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </a>
                      <div className="absolute bottom-full right-0 mb-1.5 px-2 py-1 bg-lx-text-primary text-white text-[10.5px] font-medium rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        Orderbevestiging downloaden
                        <div className="absolute top-full right-2 border-4 border-transparent border-t-lx-text-primary" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Goedkeuring sectie — alleen bij controle_vereist */}
                {order.status === 'controle_vereist' && drawings.length > 0 && (
                  <div className="px-4 sm:px-5 pb-4">
                    <OrderApprovalButtons
                      orderId={order.id}
                      orderNumber={order.order_number}
                      drawings={drawings}
                    />
                  </div>
                )}

                {/* Afkeurreden — alleen bij afgekeurd */}
                {order.status === 'afgekeurd' && order.afkeur_reden && (
                  <div className="px-4 sm:px-5 pb-4">
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      <div>
                        <p className="text-[11.5px] font-bold text-red-700 mb-0.5">Reden van afkeuring</p>
                        <p className="text-[12px] text-red-600 leading-relaxed">{order.afkeur_reden}</p>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )
          })}
        </div>
      </div>

      <AdminPagination
        currentPage={currentPage}
        totalPages={totalPages}
        total={count}
        pageSize={20}
        basePath="/bestellingen"
        hrefParams={validView ? { view } : undefined}
      />

      <div className="mt-4 flex justify-center">
        <Link
          href="/configurator/nieuw"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-lx-cta text-white text-[13px] font-semibold hover:bg-lx-cta-hover transition-colors"
        >
          + Nieuwe configuratie
        </Link>
      </div>
    </>
  )
}
