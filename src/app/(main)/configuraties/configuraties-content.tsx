import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import OrderButton from './order-button'
import DeleteButton from './delete-button'
import ConfiguratiesTabs from './configuraties-tabs'

const PAGE_SIZE = 20


const shapeLabel: Record<string, string> = {
  rechthoek: 'Rechthoek',
  rond: 'Rond',
  organic: 'Organic',
  'op-aanvraag': 'Op aanvraag',
  'rounded-rect': 'Afgerond',
  ovaal: 'Ovaal',
  arc: 'Boog',
}

function ShapeIcon({ shape }: { shape: string }) {
  if (shape === 'rond') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="1.9"><circle cx="12" cy="12" r="9"/></svg>
  )
  if (shape === 'organic') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="1.9"><path d="M12 3c4 0 9 2 9 7s-3 9-7 11c-3 1-8-1-10-5S2 7 6 4c1.5-1 4-1 6-1z"/></svg>
  )
  if (shape === 'op-aanvraag') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="1.9"><rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2"/><path d="M12 8v4m0 4h.01"/></svg>
  )
  if (shape === 'rounded-rect') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="1.9"><rect x="3" y="5" width="18" height="14" rx="4"/></svg>
  )
  if (shape === 'ovaal') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="1.9"><rect x="3" y="7" width="18" height="10" rx="5"/></svg>
  )
  if (shape === 'arc') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="1.9"><path d="M3 18 L3 12 A9 9 0 0 1 21 12 L21 18 Z"/></svg>
  )
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="1.9"><rect x="3" y="5" width="18" height="14" rx="1.5"/></svg>
  )
}

export async function ConfiguratiesContent({
  filter,
  page,
  view,
}: {
  filter: string
  page: string
  view: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const currentPage = Math.max(1, parseInt(page) || 1)
  const from = (currentPage - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Haal eigen rechten op
  const [{ data: memberPerms }, { data: profileData }] = await Promise.all([
    supabase
      .from('company_members')
      .select('role, can_order, can_configure, can_see_purchase_prices, own_configs_only, company_id')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase.from('profiles').select('price_factor, price_factor_enabled').eq('id', user.id).single(),
  ])

  const priceFactor = profileData?.price_factor ?? 1
  const priceFactorEnabled = profileData?.price_factor_enabled ?? false
  const canDownloadConsumerQuote = priceFactorEnabled && (priceFactor ?? 1) > 1

  const isManager = !memberPerms || memberPerms.role === 'manager'
  const canOrder = isManager || (memberPerms?.can_order ?? true)
  const canConfigure = isManager || (memberPerms?.can_configure ?? true)
  const canSeePurchasePrices = isManager || (memberPerms?.can_see_purchase_prices ?? false)

  // Haal teamleden op als de user manager is
  type TeamMember = { userId: string; name: string; count: number }
  let teamMembers: TeamMember[] = []

  if (isManager && memberPerms?.company_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rawMembers } = await supabase
      .from('company_members')
      .select('user_id, profiles!inner(full_name)')
      .eq('company_id', memberPerms.company_id)
      .neq('user_id', user.id)

    const memberUserIds = (rawMembers ?? []).map(m => m.user_id as string)

    // Haal config-aantallen op per teamlid
    const countResults = await Promise.all(
      memberUserIds.map(uid =>
        supabase.from('configurations').select('*', { count: 'exact', head: true }).eq('user_id', uid)
      )
    )

    teamMembers = (rawMembers ?? []).map((m, i) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profile = Array.isArray(m.profiles) ? (m.profiles as any[])[0] : m.profiles
      return {
        userId: m.user_id as string,
        name: (profile?.full_name as string | null) ?? 'Onbekend',
        count: countResults[i]?.count ?? 0,
      }
    })
  }

  // Bepaal welke user we laten zien
  const validView = view && teamMembers.some(m => m.userId === view)
  const viewUserId = isManager && validView ? view : user.id

  const [
    { data: configs, count: filteredCount },
    { count: savedCount },
  ] = await Promise.all([
    supabase
      .from('configurations')
      .select('id, name, article_number, total_price, status, created_at, updated_at, width, height, selected_options, user_id', { count: 'exact' })
      .eq('user_id', viewUserId)
      .eq('status', 'saved')
      .order('updated_at', { ascending: false })
      .range(from, to),
    supabase.from('configurations').select('*', { count: 'exact', head: true }).eq('user_id', viewUserId).eq('status', 'saved'),
  ])

  const totalPages = Math.ceil((filteredCount ?? 0) / PAGE_SIZE)
  // Product-type tabs — toekomstbestendig (straks meer producten toevoegen)
  const productTabs = [
    { key: '', label: 'Spiegels', count: savedCount ?? 0 },
    { key: 'alle', label: 'Alle', count: savedCount ?? 0 },
  ]

  // Eigen config-count voor member tab header
  const ownCount = isManager
    ? (await supabase.from('configurations').select('*', { count: 'exact', head: true }).eq('user_id', user.id)).count ?? 0
    : 0

  // Geef aan wie er bekeken wordt (voor lege-state tekst)
  const viewingName = validView
    ? teamMembers.find(m => m.userId === view)?.name.split(' ')[0] ?? 'collega'
    : null

  return (
    <>
      {/* Member tabs — alleen voor managers met teamleden */}
      {isManager && teamMembers.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3 bg-white rounded-xl p-1 border border-black/6 shadow-sm w-fit">
          {/* Eigen tab */}
          <a
            href="/configuraties"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors ${
              !validView
                ? 'bg-lx-text-primary text-white'
                : 'text-lx-text-secondary hover:text-lx-text-primary hover:bg-lx-panel-bg'
            }`}
          >
            Mijn configuraties
            {ownCount > 0 && (
              <span className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded-full ${
                !validView ? 'bg-white/20 text-white' : 'bg-lx-divider text-lx-text-secondary'
              }`}>{ownCount}</span>
            )}
          </a>
          {/* Teamlid tabs */}
          {teamMembers.map((m) => {
            const isActive = validView && view === m.userId
            const firstName = m.name.split(' ')[0]
            return (
              <a
                key={m.userId}
                href={`/configuraties?view=${m.userId}`}
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
              </a>
            )
          })}
        </div>
      )}

      {/* Status filter tabs */}
      <ConfiguratiesTabs tabs={productTabs} currentFilter={filter} view={validView ? view : undefined} />

      <div className="bg-white rounded-[18px] border border-black/6 shadow-sm">
        {configs && configs.length > 0 ? (
          <div className="divide-y divide-lx-divider">
            {configs.map((config) => {
              const date = new Date(config.updated_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
              const opts = config.selected_options as Record<string, unknown> | null
              const shape = (opts?.shape as string) ?? 'rechthoek'
              const diameter = opts?.diameter as number | null
              const organicKey = opts?.organicSize as string | null
              const extras = (opts?.extras as string[]) ?? []
              const direct = opts?.directLight as { position: string } | null
              const indirect = opts?.indirectLight as { position: string } | null

              let dimensionLabel = ''
              if (shape === 'rond' && diameter) dimensionLabel = `∅ ${diameter} cm`
              else if (shape === 'organic' && organicKey) dimensionLabel = organicKey.replace('x', ' × ') + ' cm'
              else if (config.width && config.height) dimensionLabel = `${config.width} × ${config.height} cm`

              const lightParts = []
              if (direct?.position && direct.position !== 'geen') lightParts.push('Directe verlichting')
              if (indirect?.position && indirect.position !== 'geen') lightParts.push('Indirecte verlichting')

              const metaParts = [
                shapeLabel[shape] ?? shape,
                dimensionLabel,
                ...lightParts,
                extras.length > 0 ? `${extras.length} extra${extras.length !== 1 ? "'s" : ''}` : '',
              ].filter(Boolean)

              return (
                <div key={config.id} className="flex items-center gap-4 px-5 py-4 hover:bg-lx-panel-bg transition-colors first:rounded-t-[18px] last:rounded-b-[18px]">
                  <div className="w-9 h-9 rounded-xl bg-lx-icon-bg flex items-center justify-center flex-shrink-0">
                    <ShapeIcon shape={shape} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <p className="text-[13.5px] font-semibold text-lx-text-primary truncate leading-snug">
                        {config.name ?? 'Naamloze configuratie'}
                      </p>
                      {config.article_number && (
                        <span className="text-[10.5px] font-mono font-medium text-lx-text-muted flex-shrink-0">{config.article_number}</span>
                      )}
                    </div>
                    <p className="text-[11.5px] text-lx-text-secondary mt-0.5 truncate">
                      {metaParts.join(' · ')}
                      <span className="text-lx-placeholder"> · {date}</span>
                    </p>
                  </div>
                  {canSeePurchasePrices && (
                    <div className="text-right flex-shrink-0 w-20">
                      {canDownloadConsumerQuote ? (
                        <>
                          <p className="text-[13.5px] font-bold text-lx-text-primary">
                            €{Math.round(Number(config.total_price) * priceFactor).toLocaleString('nl-NL', { minimumFractionDigits: 0 })}
                          </p>
                          <p className="text-[10.5px] text-lx-text-secondary">consument excl. btw</p>
                        </>
                      ) : (
                        <>
                          <p className="text-[13.5px] font-bold text-lx-text-primary">
                            €{Number(config.total_price).toLocaleString('nl-NL', { minimumFractionDigits: 0 })}
                          </p>
                          <p className="text-[10.5px] text-lx-text-secondary">excl. btw</p>
                        </>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {canDownloadConsumerQuote && (
                      <div className="relative group">
                        <a href={`/api/pdf/offerte/${config.id}`} download className="w-7 h-7 rounded-lg hover:bg-lx-divider flex items-center justify-center text-lx-text-secondary hover:text-lx-cta transition-colors">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        </a>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-lx-text-primary text-white text-[10.5px] font-medium rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          Klantofferte downloaden
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-lx-text-primary" />
                        </div>
                      </div>
                    )}
                    {canConfigure && (
                      <Link href={`/configurator/${config.id}`} title="Bewerken" className="w-7 h-7 rounded-lg hover:bg-lx-divider flex items-center justify-center text-lx-text-secondary hover:text-lx-text-primary transition-colors">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
                      </Link>
                    )}
                    {(config.user_id === user.id || memberPerms?.role === 'manager') && (
                      <DeleteButton configId={config.id} configName={config.name ?? 'Naamloze configuratie'} />
                    )}
                    {canOrder && shape !== 'op-aanvraag' && (
                      <OrderButton configId={config.id} configName={config.name ?? 'Naamloze configuratie'} metaSummary={metaParts.join(' · ')} price={Number(config.total_price)} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="px-5 py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-lx-icon-bg flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="1.5"/></svg>
            </div>
            <p className="text-[14px] font-semibold text-lx-text-primary mb-1">
              {viewingName
                ? `${viewingName} heeft nog geen configuraties`
                : 'Nog geen configuraties'}
            </p>
            {!viewingName && (
              <>
                <p className="text-[13px] text-lx-text-secondary mb-5">Configureer je eerste spiegel en sla hem hier op.</p>
                <Link href="/configurator/nieuw" className="inline-flex items-center gap-2 bg-lx-cta hover:bg-lx-cta-hover text-white text-[13px] font-semibold px-4 py-2.5 rounded-xl transition-colors">
                  Nieuwe spiegel configureren
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-1">
          {currentPage > 1 && (
            <Link href={(() => { const p = [validView ? `view=${view}` : '', filter ? `filter=${filter}` : '', `page=${currentPage - 1}`].filter(Boolean).join('&'); return `/configuraties${p ? '?' + p : ''}` })()} className="px-3 py-1.5 rounded-lg border border-black/10 text-[12.5px] font-medium text-lx-text-secondary hover:bg-lx-panel-bg transition-colors">← Vorige</Link>
          )}
          <span className="px-3 py-1.5 text-[12.5px] text-lx-text-secondary">{currentPage} / {totalPages}</span>
          {currentPage < totalPages && (
            <Link href={(() => { const p = [validView ? `view=${view}` : '', filter ? `filter=${filter}` : '', `page=${currentPage + 1}`].filter(Boolean).join('&'); return `/configuraties${p ? '?' + p : ''}` })()} className="px-3 py-1.5 rounded-lg border border-black/10 text-[12.5px] font-medium text-lx-text-secondary hover:bg-lx-panel-bg transition-colors">Volgende →</Link>
          )}
        </div>
      )}
    </>
  )
}

export function ConfiguratiesContentSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Tabs skeleton */}
      <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 border border-black/6 shadow-sm w-fit">
        {[72, 100, 72].map((w, i) => (
          <div key={i} className="h-7 rounded-lg bg-lx-divider" style={{ width: w }} />
        ))}
      </div>

      {/* Lijst skeleton */}
      <div className="bg-white rounded-[18px] border border-black/6 shadow-sm divide-y divide-lx-divider">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <div className="w-9 h-9 rounded-xl bg-lx-divider flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-48 bg-lx-divider rounded" />
              <div className="h-3 w-72 bg-lx-divider rounded" />
            </div>
            <div className="w-16 space-y-1">
              <div className="h-4 w-full bg-lx-divider rounded" />
              <div className="h-3 w-10 bg-lx-divider rounded" />
            </div>
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-lg bg-lx-divider" />
              <div className="w-7 h-7 rounded-lg bg-lx-divider" />
              <div className="w-16 h-7 rounded-lg bg-lx-divider" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
