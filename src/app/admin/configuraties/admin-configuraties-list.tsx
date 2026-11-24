'use client'

import { useState, useMemo, useEffect } from 'react'
import { OrderStatusSelect } from './order-status-row'
import { AdminPagination } from '@/components/admin-pagination'
import { OfferteBadge, GroothandelBadge } from '@/components/project-badge'
import { formatEuro } from '@/lib/mms'
import OrderDetailModal from './order-detail-modal'
import ConfigDetailModal, { configStatusLabels, type ConfigRow } from './config-detail-modal'
import { productIcoon } from '@/lib/product-icoon'
import { projectRegel } from '@/lib/project'
import { leesViaGroothandel } from '@/lib/groothandel-order'
import { ORDER_STATUS_LABELS, pastInBeheerFilter, type BeheerFilter } from '@/lib/beheer-filter'

// Offertes en bestellingen van dealers in één lijst. Een bestelling is een regel
// per order; een configuratie die nog niet besteld is, is een regel per configuratie.

const PAGE_SIZE = 20

// Volgorde binnen het filter Besteld: wat aandacht vraagt bovenaan
const STATUS_ORDER: Record<string, number> = {
  confirmed: 0, pending: 1, in_production: 2, shipped: 3, delivered: 4, cancelled: 5,
}

function ShapeIcon({ options }: { options: unknown }) {
  return <img src={productIcoon(options)} width="15" height="15" alt="" />
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export type AdminOrder = {
  id: string
  order_number: string
  /** Gezamenlijk ordernummer van een projectorder */
  order_group?: string | null
  quantity: number
  unit_price: number
  total_price: number
  status: string
  notes?: string | null
  created_at: string
  config: { id: string; name: string | null; article_number?: string | null; width: number | null; height: number | null; selected_options: Record<string, unknown> } | null
  profile: { full_name: string | null; company: string | null; email: string | null } | null
}

export type BeheerItem =
  | { soort: 'order'; order: AdminOrder }
  | { soort: 'config'; config: ConfigRow }

const itemId = (item: BeheerItem) => (item.soort === 'order' ? `o-${item.order.id}` : `c-${item.config.id}`)
const itemDatum = (item: BeheerItem) => (item.soort === 'order' ? item.order.created_at : item.config.updated_at)

function zoektekst(item: BeheerItem): string {
  const profile = item.soort === 'order' ? item.order.profile : item.config.profiles
  const config = item.soort === 'order' ? item.order.config : item.config
  return [
    item.soort === 'order' ? item.order.order_number : '',
    item.soort === 'order' ? ORDER_STATUS_LABELS[item.order.status] : configStatusLabels[item.config.status]?.label,
    config?.name, config?.article_number,
    profile?.company, profile?.full_name, profile?.email,
    leesViaGroothandel(config?.selected_options) ? 'via groothandel' : '',
  ].filter(Boolean).join(' ').toLowerCase()
}

const kolommen = 'grid-cols-[36px_1.2fr_1fr_64px_96px_160px]'
const kop = 'text-[10.5px] font-semibold text-lx-text-secondary uppercase tracking-wider'

export function AdminConfiguratiesList({ items: bron, startFilter }: { items: BeheerItem[]; startFilter: BeheerFilter }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<BeheerFilter>(startFilter)
  const [currentPage, setCurrentPage] = useState(1)
  // Regel waarvan het detailvenster open staat
  const [detailId, setDetailId] = useState<string | null>(null)
  // Statussen die in deze sessie zijn gewijzigd, zodat filters en tellers meteen kloppen
  const [gewijzigd, setGewijzigd] = useState<Record<string, string>>({})

  const items = useMemo(() => bron.map((item) => (
    item.soort === 'order' && gewijzigd[item.order.id]
      ? { ...item, order: { ...item.order, status: gewijzigd[item.order.id] } }
      : item
  )), [bron, gewijzigd])

  const filterItem = (item: BeheerItem) => ({ soort: item.soort, status: item.soort === 'order' ? item.order.status : item.config.status })

  const tellers = useMemo(() => {
    const t: Record<string, number> = { alle: items.length, offerte: 0, besteld: 0 }
    for (const item of items) {
      const f = filterItem(item)
      if (pastInBeheerFilter(f, 'offerte')) t.offerte++
      else t.besteld++
      if (item.soort === 'order') t[item.order.status] = (t[item.order.status] ?? 0) + 1
    }
    return t
  }, [items])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    const lijst = items.filter((item) => pastInBeheerFilter(filterItem(item), filter) && (!q || zoektekst(item).includes(q)))
    const opDatum = (a: BeheerItem, b: BeheerItem) => new Date(itemDatum(b)).getTime() - new Date(itemDatum(a)).getTime()
    // Besteld: eerst op status, zoals de bestellingenlijst altijd deed; anders op datum
    if (filter !== 'besteld') return lijst.sort(opDatum)
    const rang = (item: BeheerItem) => (item.soort === 'order' ? STATUS_ORDER[item.order.status] ?? 99 : 99)
    return lijst.sort((a, b) => rang(a) - rang(b) || opDatum(a, b))
  }, [items, query, filter])

  useEffect(() => { setCurrentPage(1) }, [query, filter])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  // Het open venster volgt de lijst: verdwijnt de regel (verwijderd, besteld), dan sluit het
  const detail = detailId ? items.find((item) => itemId(item) === detailId) ?? null : null
  const besteldActief = filter !== 'alle' && filter !== 'offerte'

  const tabs: { key: BeheerFilter; label: string }[] = [
    { key: 'alle', label: 'Alle' },
    { key: 'offerte', label: 'Offertes' },
    { key: 'besteld', label: 'Besteld' },
  ]

  return (
    <>
      {/* Zoekveld + filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="relative flex-1">
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
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-black/10 bg-white text-[13px] text-lx-text-primary placeholder:text-lx-placeholder focus:outline-none focus:ring-2 focus:ring-lx-cta/20 focus:border-lx-cta transition-colors shadow-sm"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Zoekterm wissen"
              className="absolute inset-y-0 right-3 flex items-center text-lx-text-secondary hover:text-lx-text-primary transition-colors cursor-pointer"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        <div className="flex gap-1 bg-white rounded-xl p-1 border border-black/6 shadow-sm w-fit">
          {tabs.map((tab) => {
            const isActive = tab.key === 'besteld' ? besteldActief : filter === tab.key
            const aantal = tellers[tab.key] ?? 0
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                aria-pressed={isActive}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors cursor-pointer ${
                  isActive ? 'bg-lx-text-primary text-white' : 'text-lx-text-secondary hover:text-lx-text-primary hover:bg-lx-panel-bg'
                }`}
              >
                {tab.label}
                {aantal > 0 && (
                  <span className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-lx-divider text-lx-text-secondary'}`}>{aantal}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Orderstatussen: tellers en filter in één */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {Object.entries(ORDER_STATUS_LABELS).map(([status, label]) => {
          const isActive = filter === status
          return (
            <button
              key={status}
              onClick={() => setFilter(isActive ? 'besteld' : status)}
              aria-pressed={isActive}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11.5px] font-medium transition-colors cursor-pointer ${
                isActive ? 'bg-lx-text-primary text-white border-lx-text-primary' : 'bg-white text-lx-text-secondary border-black/6 hover:text-lx-text-primary hover:border-black/15'
              }`}
            >
              {label}
              <span className={`font-bold ${isActive ? 'text-white' : 'text-lx-text-primary'}`}>{tellers[status] ?? 0}</span>
            </button>
          )
        })}
      </div>

      {(query || filter !== 'alle') && filtered.length > 0 && (
        <p className="text-[12px] text-lx-text-secondary mb-3">{filtered.length} van {items.length}</p>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-[18px] border border-black/6 shadow-sm px-5 py-12 text-center">
          <p className="text-[14px] font-semibold text-lx-text-primary mb-1">Geen resultaten</p>
          <p className="text-[13px] text-lx-text-secondary">{query ? 'Probeer een andere zoekterm of een ander filter.' : 'Er is niets met deze status.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden">
          {/* Header, desktop */}
          <div className={`hidden lg:grid ${kolommen} gap-4 items-center px-5 py-2.5 border-b border-lx-divider bg-lx-panel-bg/60`}>
            <div />
            <div className={kop}>Configuratie · Order</div>
            <div className={kop}>Dealer</div>
            <div className={`${kop} text-center`}>Aantal</div>
            <div className={`${kop} text-right`}>Prijs</div>
            <div className={`${kop} text-center`}>Status</div>
          </div>

          <div className="divide-y divide-lx-divider">
            {paged.map((item) => {
              const id = itemId(item)
              const config = item.soort === 'order' ? item.order.config : item.config
              const profile = item.soort === 'order' ? item.order.profile : item.config.profiles
              const opts = (config?.selected_options ?? {}) as { shape?: string; meubel?: { opAanvraag?: boolean } }
              const shape = opts.shape ?? 'rechthoek'
              const isProjectspiegel = shape === 'projectspiegel'
              // Ook een meubel groter dan standaard is een offerteaanvraag zonder prijs
              const isOpAanvraag = shape === 'op-aanvraag' || (shape === 'meubel' && opts.meubel?.opAanvraag === true)
              const viaGroothandel = !!leesViaGroothandel(config?.selected_options)
              const open = () => setDetailId(id)

              let titel: React.ReactNode
              let onderregel: string
              let aantal: number
              let prijs: string
              let prijsSub = ''
              let status: React.ReactNode
              if (item.soort === 'order') {
                const order = item.order
                titel = <><button type="button" onClick={(e) => { e.stopPropagation(); open() }} className="font-mono font-bold hover:text-lx-cta hover:underline cursor-pointer" title="Details en PDF">{order.order_number}</button>{isOpAanvraag && <OfferteBadge className="ml-1.5" />}{viaGroothandel && <GroothandelBadge className="ml-1.5" />}</>
                onderregel = `${formatDate(order.created_at)} · ${order.config?.name ?? '—'}`
                aantal = order.quantity
                prijs = isOpAanvraag ? 'Op offerte' : formatEuro(Number(order.total_price))
                if (!isOpAanvraag && order.quantity > 1) prijsSub = `€${Number(order.unit_price).toLocaleString('nl-NL')} p.st.`
                status = <div onClick={(e) => e.stopPropagation()}><OrderStatusSelect orderId={order.id} currentStatus={order.status} onChanged={(s) => setGewijzigd((oud) => ({ ...oud, [order.id]: s }))} /></div>
              } else {
                const c = item.config
                const regel = projectRegel({ ...c, selected_options: c.selected_options })
                const label = configStatusLabels[c.status] ?? configStatusLabels.draft
                titel = <><button type="button" onClick={(e) => { e.stopPropagation(); open() }} className="font-semibold hover:text-lx-cta hover:underline cursor-pointer text-left" title="Details en PDF">{c.name ?? 'Naamloze configuratie'}</button>{c.article_number && <span className="ml-2 text-[10.5px] font-mono font-medium text-lx-text-muted">{c.article_number}</span>}</>
                onderregel = [formatDate(c.updated_at), regel.titel, regel.omschrijving].filter(Boolean).join(' · ')
                aantal = regel.quantity
                prijs = isOpAanvraag ? 'Op aanvraag' : `€${Number(c.total_price).toLocaleString('nl-NL', { minimumFractionDigits: 0 })}`
                if (!isOpAanvraag) prijsSub = isProjectspiegel ? 'netto totaal' : 'bruto p.st.'
                status = <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap border ${label.className}`}>{label.label}</span>
              }
              const dealer = profile?.company ?? profile?.full_name ?? profile?.email ?? '—'

              return (
                <div key={id} onClick={open} className={`cursor-pointer transition-colors ${isProjectspiegel ? 'border-l-[3px] border-l-violet-500 bg-violet-50/30 hover:bg-violet-50/50' : isOpAanvraag ? 'border-l-[3px] border-l-amber-400 bg-amber-50/30 hover:bg-amber-50/50' : 'hover:bg-lx-panel-bg/40'}`}>
                  {/* Mobile */}
                  <div className="lg:hidden px-4 py-3.5 flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-lx-icon-bg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <ShapeIcon options={config?.selected_options} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <p className="text-[12.5px] text-lx-text-primary">{titel}</p>
                          <p className="text-[11px] text-lx-text-secondary truncate">{onderregel}</p>
                        </div>
                        <div className="flex-shrink-0">{status}</div>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-[11.5px] font-medium text-lx-text-primary truncate">{dealer} · {aantal}×</p>
                        <p className="text-[13px] font-bold text-lx-text-primary">{prijs}</p>
                      </div>
                    </div>
                  </div>

                  {/* Desktop */}
                  <div className={`hidden lg:grid ${kolommen} gap-4 items-center px-5 py-3.5`}>
                    <div className="w-8 h-8 rounded-xl bg-lx-icon-bg flex items-center justify-center">
                      <ShapeIcon options={config?.selected_options} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12.5px] text-lx-text-primary truncate">{titel}</p>
                      <p className="text-[11px] text-lx-text-secondary mt-0.5 truncate">{onderregel}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold text-lx-text-primary truncate">{profile?.company ?? '—'}</p>
                      <p className="text-[11px] text-lx-text-secondary mt-0.5 truncate">{profile?.full_name ?? profile?.email ?? '—'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[12.5px] font-medium text-lx-text-primary">{aantal}×</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[13px] font-bold text-lx-text-primary">{prijs}</p>
                      {prijsSub && <p className="text-[10.5px] text-lx-text-secondary">{prijsSub}</p>}
                    </div>
                    <div className="flex justify-center">{status}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {detail?.soort === 'order' && (
        <OrderDetailModal order={detail.order} statusLabel={ORDER_STATUS_LABELS[detail.order.status] ?? detail.order.status} onClose={() => setDetailId(null)} />
      )}
      {detail?.soort === 'config' && (
        <ConfigDetailModal
          config={detail.config}
          projectOpen={detail.config.project_id ? items.filter((i) => i.soort === 'config' && i.config.project_id === detail.config.project_id && i.config.status !== 'ordered').length : 0}
          onClose={() => setDetailId(null)}
        />
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
