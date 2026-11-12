'use client'

import { leesMeubel, meubelKort } from '@/lib/meubel-opslag'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import OrderButton from './order-button'
import TekeningUpload from '@/components/tekening-upload'
import { AdminPagination } from '@/components/admin-pagination'
import ConfiguratiesTabs from './configuraties-tabs'
import ConfigActionsMenu from './config-actions-menu'
import type { ConfigPreview } from '@/app/(main)/configurator/nieuw/price-panel'
import type { ShapeSlug, GlasKleur } from '@/lib/configurator-config'
import { formatOrganicSize } from '@/lib/configurator-config'
import { fetchConfigurations } from '@/lib/queries/fetch-configurations'
import { ProjectBadge } from '@/components/project-badge'
import { VisualisationButton, type VisualisationConfig } from '@/components/visualisation-modal'
import { ConfiguratiesContentSkeleton } from './configuraties-skeleton'

const shapeLabel: Record<string, string> = {
  rechthoek: 'Rechthoek',
  rond: 'Rond',
  organic: 'Organic',
  'op-aanvraag': 'Op aanvraag',
  'rounded-rect': 'Afgerond',
  ovaal: 'Ovaal',
  elips: 'Ellips',
  arc: 'Boog',
  sol: 'Sol',
  luna: 'Luna',
  projectspiegel: 'Projectspiegel',
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

  const { configs, filteredCount, savedCount, meubelCount, meubelToegang, ownCount, permissions, teamMembers, validView, viewingName, korting, currentPage, totalPages, currentUserId } = data

  // Standaard alles door elkaar. De tab Meubels alleen voor wie meubels heeft of mag maken.
  const toonMeubels = meubelToegang || meubelCount > 0 || filter === 'meubels'
  const productTabs = [
    { key: '', label: 'Alle', count: savedCount },
    ...(toonMeubels ? [
      { key: 'spiegels', label: 'Spiegels', count: savedCount - meubelCount },
      { key: 'meubels', label: 'Tailor-Made', count: meubelCount },
    ] : []),
  ]

  return (
    <>
      {/* Member tabs — alleen voor managers met teamleden */}
      {permissions.isManager && teamMembers.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3 bg-white rounded-xl p-1 border border-black/6 shadow-sm w-fit">
          {/* Eigen tab */}
          <Link
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
          </Link>
          {/* Teamlid tabs */}
          {teamMembers.map((m) => {
            const isActive = validView && view === m.userId
            const firstName = m.name.split(' ')[0]
            return (
              <Link
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
              </Link>
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
              <div className="w-[68px] flex-shrink-0" />
            </div>

            <div className="divide-y divide-lx-divider">
              {configs.map((config) => {
                const date = new Date(config.updated_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
                const opts = config.selected_options as Record<string, unknown> | null
                const shape = (opts?.shape as string) ?? 'rechthoek'
                const meubel = leesMeubel(opts)
                const diameter = opts?.diameter as number | null
                const organicKey = opts?.organicSizeKey as string | null
                const extras = (opts?.extras as string[]) ?? []
                const direct = opts?.directLight as { position: string; control?: string | null } | null
                const indirect = opts?.indirectLight as { position: string; control?: string | null } | null

                let dimensionLabel = ''
                if (meubel) dimensionLabel = [meubelKort(meubel), meubel.houtkleurNaam].filter(Boolean).join(' · ')
                else if ((shape === 'rond' || shape === 'sol' || shape === 'luna') && diameter) dimensionLabel = `∅ ${diameter} cm`
                else if (shape === 'organic' && organicKey) dimensionLabel = formatOrganicSize(organicKey)
                else if (config.width && config.height) dimensionLabel = `${config.width} × ${config.height} cm`

                const lightParts = []
                if (direct?.position && direct.position !== 'geen') lightParts.push('Direct licht')
                if (indirect?.position && indirect.position !== 'geen') lightParts.push('Indirect licht')

                // Aantal uit de offertefase (maatwerk). Bij projectspiegels is het
                // aantal al in de totaalprijs verwerkt en loopt het via projectspiegelStuks.
                const savedQuantity = shape === 'projectspiegel' ? 1 : Math.max(1, Math.floor(Number(opts?.quantity) || 1))
                const quantityLabel = savedQuantity > 1 ? `${savedQuantity}×` : ''
                const savedMms = Number(opts?.mmsQuantity) || 0
                const mmsLabel = savedMms > 0 ? `Glass Cleaner set ${savedMms}×` : ''

                const extrasLabel = extras.length > 0 ? `${extras.length} extra${extras.length !== 1 ? "'s" : ''}` : ''
                const metaParts = [
                  (meubel ? meubel.model.naam : shapeLabel[shape] ?? shape),
                  dimensionLabel,
                  ...lightParts,
                  extrasLabel,
                ].filter(Boolean)
                // Lijstweergave toont ook het aantal; de bestelmodal niet, daar is het aanpasbaar
                const listMeta = [
                  (meubel ? meubel.model.naam : shapeLabel[shape] ?? shape),
                  dimensionLabel,
                  quantityLabel,
                  ...lightParts,
                  extrasLabel,
                  mmsLabel,
                ].filter(Boolean).join(' · ')

                const canDelete = config.user_id === currentUserId || permissions.isManager
                const isProjectspiegel = shape === 'projectspiegel'
                const projectspiegelStuks = isProjectspiegel ? (opts?.quantity as number | undefined) : undefined
                const displayPrice = Number(config.total_price)
                const priceLabel = isProjectspiegel ? 'Netto ex. BTW' : savedQuantity > 1 ? 'Per stuk ex. BTW' : 'Bruto ex. BTW'

                const visualisationConfig: VisualisationConfig | null =
                  (shape === 'rechthoek' || shape === 'rounded-rect' || shape === 'rond' || shape === 'organic' || shape === 'ovaal' || shape === 'arc')
                    ? {
                        shape: shape as VisualisationConfig['shape'],
                        // Organic-maat komt uit de key (kolommen width/height staan bij
                        // organic altijd op de default 80/60 en zijn dus onbruikbaar)
                        width: shape === 'rond' ? (diameter ?? 80) : shape === 'organic' ? (Number(organicKey?.split('x')[0]) || 80) : (config.width ?? 80),
                        height: shape === 'rond' ? (diameter ?? 80) : shape === 'organic' ? (Number(organicKey?.split('x')[1]) || 60) : (config.height ?? 60),
                        glasKleur: ((opts?.glasKleur as string) ?? 'helder') as VisualisationConfig['glasKleur'],
                        directPositions: direct?.position && direct.position !== 'geen' ? [direct.position] : [],
                        indirectPositions: indirect?.position && indirect.position !== 'geen' ? [indirect.position] : [],
                        lichtKelvin: 3000,
                        frameColor: extras.includes('frame-in-kleur')
                          ? ((opts?.optionSubChoices as Record<string, string> | undefined)?.['frame-in-kleur'] as VisualisationConfig['frameColor']) ?? null
                          : null,
                        tipTouch: direct?.control === 'tip-touch' || indirect?.control === 'tip-touch',
                        clockPosition: extras.includes('digitale-klok')
                          ? (((opts?.optionSubChoices as Record<string, string> | undefined)?.['digitale-klok'] as VisualisationConfig['clockPosition']) ?? 'midden')
                          : null,
                      }
                    : null

                const configPreview: ConfigPreview | undefined = shape && shape !== 'projectspiegel' && !meubel ? {
                  shape: shape as ShapeSlug,
                  width: config.width ?? null,
                  height: config.height ?? null,
                  diameter: opts?.diameter as number | null ?? null,
                  organicSizeKey: organicKey ?? null,
                  glasKleur: opts?.glasKleur as GlasKleur | null ?? null,
                  directLight: direct ? { position: direct.position, type: (direct as { position: string; type?: string | null }).type ?? null } : undefined,
                  indirectLight: indirect ? { position: indirect.position, type: (indirect as { position: string; type?: string | null }).type ?? null } : undefined,
                  extras: extras.length > 0 ? extras : undefined,
                  optionSubChoices: opts?.optionSubChoices as Record<string, string> | undefined,
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
                            {isProjectspiegel && <ProjectBadge className="ml-1.5" />}
                            {config.project_id && <span className="ml-1.5 align-middle text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-lx-icon-bg text-lx-cta">Project</span>}
                          </p>
                          <p className="text-[13px] font-bold text-lx-text-primary flex-shrink-0">
                            {shape === 'op-aanvraag' || meubel?.opAanvraag ? 'Op offerte' : `€${displayPrice.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}`}
                          </p>
                        </div>
                        <p className="text-[11px] text-lx-text-secondary mt-0.5 truncate">
                          {config.article_number && <span className="font-mono">{config.article_number} · </span>}
                          {listMeta}
                          <span className="text-lx-placeholder"> · {date}</span>
                        </p>
                        <div className="flex items-center justify-end gap-2 mt-2.5">
                          {visualisationConfig && (
                            <VisualisationButton config={visualisationConfig} configurationId={config.id} variant="icoon" />
                          )}
                          {meubel?.tekeningOntbreekt && <TekeningUpload configId={config.id} />}
                          {permissions.canOrder && (
                            <OrderButton meubel={meubel} projectId={config.project_id} configId={config.id} configName={config.name ?? 'Naamloze configuratie'} metaSummary={metaParts.join(' · ')} price={Number(config.total_price)} korting={korting} isProjectspiegel={isProjectspiegel} projectspiegelStuks={projectspiegelStuks} configPreview={configPreview} isOpAanvraag={shape === 'op-aanvraag'} initialQuantity={savedQuantity} initialMmsQuantity={Number(opts?.mmsQuantity) || 0} mmsUnitPrice={opts?.mmsUnitPrice as number | undefined} />
                          )}
                          <ConfigActionsMenu
                            configId={config.id}
                            configName={config.name ?? 'Naamloze configuratie'}
                            canDownload={true}
                            canEdit={permissions.canConfigure}
                            canDelete={canDelete}
                          projectId={config.project_id}
                          kanProject
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
                          {isProjectspiegel && <ProjectBadge className="ml-1.5" />}
                            {config.project_id && <span className="ml-1.5 align-middle text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-lx-icon-bg text-lx-cta">Project</span>}
                        </p>
                        <p className="text-[11px] text-lx-text-secondary mt-0.5 truncate">
                          {config.article_number && <span className="font-mono">{config.article_number} · </span>}
                          <span className="lg:hidden">{listMeta} · </span>
                          {date}
                          {mmsLabel && <span className="hidden lg:inline"> · {mmsLabel}</span>}
                        </p>
                      </div>

                      {/* Col: Vorm + afmeting — desktop only */}
                      <div className="hidden lg:block w-[152px] flex-shrink-0">
                        <p className="text-[12px] font-medium text-lx-text-primary">{(meubel ? meubel.model.naam : shapeLabel[shape] ?? shape)}</p>
                        <p className="text-[11px] text-lx-text-secondary mt-0.5">{dimensionLabel || '—'}{quantityLabel && ` · ${quantityLabel}`}</p>
                      </div>

                      {/* Col: Price */}
                      <div className="w-[92px] flex-shrink-0 text-right">
                        <p className="text-[13px] font-bold text-lx-text-primary">
                          {shape === 'op-aanvraag' || meubel?.opAanvraag ? 'Op offerte' : `€${displayPrice.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}`}
                        </p>
                        {shape !== 'op-aanvraag' && !meubel?.opAanvraag && <p className="text-[10.5px] text-lx-text-secondary mt-0.5">{priceLabel}</p>}
                      </div>

                      {meubel?.tekeningOntbreekt && <TekeningUpload configId={config.id} />}

                      {/* Col: Bestellen / Aanvragen CTA */}
                      {permissions.canOrder && (
                        <div className="w-[96px] flex-shrink-0 flex justify-end">
                          <OrderButton meubel={meubel} projectId={config.project_id} configId={config.id} configName={config.name ?? 'Naamloze configuratie'} metaSummary={metaParts.join(' · ')} price={Number(config.total_price)} korting={korting} isProjectspiegel={isProjectspiegel} projectspiegelStuks={projectspiegelStuks} configPreview={configPreview} isOpAanvraag={shape === 'op-aanvraag'} initialQuantity={savedQuantity} initialMmsQuantity={Number(opts?.mmsQuantity) || 0} mmsUnitPrice={opts?.mmsUnitPrice as number | undefined} />
                        </div>
                      )}

                      {/* Col: visualisatie + 3-dot menu */}
                      <div className="w-[68px] flex-shrink-0 flex items-center justify-end gap-1">
                        {visualisationConfig && (
                          <VisualisationButton config={visualisationConfig} configurationId={config.id} variant="icoon" />
                        )}
                        <ConfigActionsMenu
                          configId={config.id}
                          configName={config.name ?? 'Naamloze configuratie'}
                          canDownload={true}
                          canEdit={permissions.canConfigure}
                          canDelete={canDelete}
                          projectId={config.project_id}
                          kanProject
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
                <p className="text-[13px] text-lx-text-secondary mb-5">Maak je eerste configuratie en sla hem hier op.</p>
                <Link href="/configurator/nieuw" className="inline-flex items-center gap-2 bg-lx-cta hover:bg-lx-cta-hover text-white text-[13px] font-semibold px-4 py-2.5 rounded-xl transition-colors">
                  Nieuwe configuratie
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
