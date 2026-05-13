'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import OrderButton from './order-button'
import { AdminPagination } from '@/components/admin-pagination'
import ConfiguratiesTabs from './configuraties-tabs'
import ConfigActionsMenu from './config-actions-menu'
import type { ConfigPreview } from '@/app/configurator/nieuw/price-panel'
import type { ShapeSlug, GlasKleur } from '@/lib/configurator-config'
import { fetchConfigurations } from '@/lib/queries/fetch-configurations'

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
  return <img src={`/icons/shapes/${shape}.svg`} width="15" height="15" alt="" />
}

export function ConfiguratiesContent({
  filter,
  page,
  view,
}: {
  filter: string
  page: string
  view: string
}) {
  const { data } = useQuery({
    queryKey: ['configurations', { filter, view, page }],
    queryFn: () => fetchConfigurations({ filter, view, page: Number(page) }),
  })

  if (!data) return <ConfiguratiesContentSkeleton />

  const { configs, filteredCount, savedCount, ownCount, permissions, teamMembers, validView, viewingName, korting, currentPage, totalPages, currentUserId } = data

  const productTabs = [
    { key: '', label: 'Spiegels', count: savedCount },
    { key: 'alle', label: 'Alle', count: savedCount },
  ]

  return (
    <>
      {/* Member tabs — alleen voor managers met teamleden */}
      {permissions.isManager && teamMembers.length > 0 && (
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

      <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden">
        {configs && configs.length > 0 ? (
          <>
            {/* Column headers — tablet+ only */}
            <div className="hidden sm:flex items-center gap-4 px-5 py-2.5 border-b border-lx-divider bg-lx-panel-bg/60">
              <div className="w-9 flex-shrink-0" />
              <div className="flex-1 min-w-0 text-[10.5px] font-semibold text-lx-text-secondary uppercase tracking-wider">Naam</div>
              <div className="w-[152px] flex-shrink-0 text-[10.5px] font-semibold text-lx-text-secondary uppercase tracking-wider hidden lg:block">Afmeting (B × H)</div>
              <div className="w-[92px] flex-shrink-0 text-right text-[10.5px] font-semibold text-lx-text-secondary uppercase tracking-wider">Prijs</div>
              {permissions.canOrder && (
                <div className="w-[96px] flex-shrink-0" />
              )}
              <div className="w-8 flex-shrink-0" />
            </div>

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
                if (direct?.position && direct.position !== 'geen') lightParts.push('Direct licht')
                if (indirect?.position && indirect.position !== 'geen') lightParts.push('Indirect licht')

                const metaParts = [
                  shapeLabel[shape] ?? shape,
                  dimensionLabel,
                  ...lightParts,
                  extras.length > 0 ? `${extras.length} extra${extras.length !== 1 ? "'s" : ''}` : '',
                ].filter(Boolean)

                const canDelete = config.user_id === currentUserId || permissions.isManager
                const isProjectspiegel = shape === 'projectspiegel'
                const projectspiegelStuks = isProjectspiegel ? (opts?.quantity as number | undefined) : undefined
                const displayPrice = Number(config.total_price)
                const priceLabel = isProjectspiegel ? 'Netto ex. BTW' : 'Bruto ex. BTW'

                const configPreview: ConfigPreview | undefined = shape && shape !== 'projectspiegel' ? {
                  shape: shape as ShapeSlug,
                  width: config.width ?? null,
                  height: config.height ?? null,
                  diameter: opts?.diameter as number | null ?? null,
                  organicSizeKey: opts?.organicSize as string | null ?? null,
                  glasKleur: opts?.glasKleur as GlasKleur | null ?? null,
                  directLight: direct ? { position: direct.position, type: (direct as { position: string; type?: string | null }).type ?? null } : undefined,
                  indirectLight: indirect ? { position: indirect.position, type: (indirect as { position: string; type?: string | null }).type ?? null } : undefined,
                  extras: extras.length > 0 ? extras : undefined,
                } : undefined

                return (
                  <div key={config.id} className="hover:bg-lx-panel-bg/50 transition-colors">

                    {/* Mobile layout */}
                    <div className="flex gap-3 px-4 py-3.5 sm:hidden">
                      <div className="w-9 h-9 rounded-xl bg-lx-icon-bg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <ShapeIcon shape={shape} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[13px] font-semibold text-lx-text-primary truncate leading-snug">
                            {config.name ?? 'Naamloze configuratie'}
                          </p>
                          <p className="text-[13px] font-bold text-lx-text-primary flex-shrink-0">
                            €{displayPrice.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}
                          </p>
                        </div>
                        <p className="text-[11px] text-lx-text-secondary mt-0.5 truncate">
                          {config.article_number && <span className="font-mono">{config.article_number} · </span>}
                          {metaParts.join(' · ')}
                          <span className="text-lx-placeholder"> · {date}</span>
                        </p>
                        <div className="flex items-center justify-end gap-2 mt-2.5">
                          {permissions.canOrder && shape !== 'op-aanvraag' && (
                            <OrderButton configId={config.id} configName={config.name ?? 'Naamloze configuratie'} metaSummary={metaParts.join(' · ')} price={Number(config.total_price)} korting={korting} isProjectspiegel={isProjectspiegel} projectspiegelStuks={projectspiegelStuks} configPreview={configPreview} />
                          )}
                          <ConfigActionsMenu
                            configId={config.id}
                            configName={config.name ?? 'Naamloze configuratie'}
                            canDownload={true}
                            canEdit={permissions.canConfigure}
                            canDelete={canDelete}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Tablet / Desktop layout */}
                    <div className="hidden sm:flex items-center gap-4 px-5 py-3.5">
                      {/* Icon */}
                      <div className="w-9 h-9 rounded-xl bg-lx-icon-bg flex items-center justify-center flex-shrink-0">
                        <ShapeIcon shape={shape} />
                      </div>

                      {/* Col: Name + meta */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-semibold text-lx-text-primary truncate">
                          {config.name ?? 'Naamloze configuratie'}
                        </p>
                        <p className="text-[11px] text-lx-text-secondary mt-0.5 truncate">
                          {config.article_number && <span className="font-mono">{config.article_number} · </span>}
                          <span className="lg:hidden">{metaParts.join(' · ')} · </span>
                          {date}
                        </p>
                      </div>

                      {/* Col: Vorm + afmeting — desktop only */}
                      <div className="hidden lg:block w-[152px] flex-shrink-0">
                        <p className="text-[12px] font-medium text-lx-text-primary">{shapeLabel[shape] ?? shape}</p>
                        <p className="text-[11px] text-lx-text-secondary mt-0.5">{dimensionLabel || '—'}</p>
                      </div>

                      {/* Col: Price */}
                      <div className="w-[92px] flex-shrink-0 text-right">
                        <p className="text-[13px] font-bold text-lx-text-primary">
                          €{displayPrice.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}
                        </p>
                        <p className="text-[10.5px] text-lx-text-secondary mt-0.5">{priceLabel}</p>
                      </div>

                      {/* Col: Bestellen CTA */}
                      {permissions.canOrder && (
                        <div className="w-[96px] flex-shrink-0 flex justify-end">
                          {shape !== 'op-aanvraag' && (
                            <OrderButton configId={config.id} configName={config.name ?? 'Naamloze configuratie'} metaSummary={metaParts.join(' · ')} price={Number(config.total_price)} korting={korting} isProjectspiegel={isProjectspiegel} projectspiegelStuks={projectspiegelStuks} configPreview={configPreview} />
                          )}
                        </div>
                      )}

                      {/* Col: 3-dot menu */}
                      <div className="w-8 flex-shrink-0 flex justify-end">
                        <ConfigActionsMenu
                          configId={config.id}
                          configName={config.name ?? 'Naamloze configuratie'}
                          canDownload={true}
                          canEdit={permissions.canConfigure}
                          canDelete={canDelete}
                        />
                      </div>
                    </div>

                  </div>
                )
              })}
            </div>
          </>
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

      <AdminPagination
        currentPage={currentPage}
        totalPages={totalPages}
        total={filteredCount}
        pageSize={20}
        basePath="/configuraties"
        hrefParams={{
          ...(validView ? { view } : {}),
          ...(filter ? { filter } : {}),
        }}
      />
    </>
  )
}

export function ConfiguratiesContentSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Member tabs placeholder */}
      <div className="flex gap-1 mb-3 bg-white rounded-xl p-1 border border-black/6 shadow-sm w-fit">
        <div className="h-7 w-32 rounded-lg bg-lx-divider" />
        <div className="h-7 w-20 rounded-lg bg-lx-divider" />
      </div>

      {/* Product tabs (Spiegels / Alle) */}
      <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 border border-black/6 shadow-sm w-fit">
        <div className="h-7 w-20 rounded-lg bg-lx-text-primary/10" />
        <div className="h-7 w-14 rounded-lg bg-lx-divider" />
      </div>

      {/* Lijst */}
      <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden">
        <div className="hidden sm:flex items-center gap-4 px-5 py-2.5 border-b border-lx-divider bg-lx-panel-bg/60">
          <div className="w-9 flex-shrink-0" />
          <div className="flex-1 h-2.5 bg-lx-divider rounded" />
          <div className="hidden lg:block w-[152px] h-2.5 bg-lx-divider rounded flex-shrink-0" />
          <div className="w-[92px] h-2.5 bg-lx-divider rounded flex-shrink-0" />
          <div className="w-[96px] flex-shrink-0" />
          <div className="w-8 flex-shrink-0" />
        </div>
        <div className="divide-y divide-lx-divider">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-xl bg-lx-divider flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-48 bg-lx-divider rounded" />
                <div className="h-3 w-32 bg-lx-divider rounded" />
              </div>
              <div className="hidden lg:block w-[152px] flex-shrink-0 space-y-1.5">
                <div className="h-3.5 w-20 bg-lx-divider rounded" />
                <div className="h-3 w-16 bg-lx-divider rounded" />
              </div>
              <div className="hidden sm:block w-[92px] flex-shrink-0 space-y-1">
                <div className="h-3.5 w-full bg-lx-divider rounded" />
                <div className="h-3 w-12 bg-lx-divider rounded ml-auto" />
              </div>
              <div className="hidden sm:block w-[96px] flex-shrink-0">
                <div className="h-8 w-full bg-lx-divider rounded-xl" />
              </div>
              <div className="w-8 flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-lx-divider" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-5 text-center text-[12px] text-lx-text-muted">Jouw data aan het ophalen…</p>
    </div>
  )
}
