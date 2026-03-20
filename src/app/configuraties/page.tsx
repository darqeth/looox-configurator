import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import OrderButton from './order-button'
import DeleteButton from './delete-button'

const statusLabels: Record<string, { label: string; className: string }> = {
  saved:   { label: 'Opgeslagen',  className: 'bg-blue-50 text-blue-700' },
  ordered: { label: 'Besteld',     className: 'bg-green-50 text-green-700' },
}

const shapeLabel: Record<string, string> = {
  rechthoek: 'Rechthoek',
  rond: 'Rond',
  organic: 'Organic',
  'op-aanvraag': 'Op aanvraag',
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
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="1.9"><rect x="3" y="5" width="18" height="14" rx="1.5"/></svg>
  )
}

export default async function ConfiguratiesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { filter } = await searchParams

  let query = supabase
    .from('configurations')
    .select('id, name, article_number, total_price, status, created_at, updated_at, width, height, selected_options')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (filter && ['saved', 'ordered'].includes(filter)) {
    query = query.eq('status', filter)
  }

  const { data: configs } = await query

  const { data: allConfigs } = await supabase
    .from('configurations')
    .select('status')
    .eq('user_id', user.id)

  const counts = {
    all: allConfigs?.length ?? 0,
    saved: allConfigs?.filter(c => c.status === 'saved').length ?? 0,
    ordered: allConfigs?.filter(c => c.status === 'ordered').length ?? 0,
  }

  const tabs = [
    { key: '', label: 'Alle', count: counts.all },
    { key: 'saved', label: 'Opgeslagen', count: counts.saved },
    { key: 'ordered', label: 'Besteld', count: counts.ordered },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-7">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-bold text-lx-text-primary tracking-tight">Configuraties</h1>
          <p className="text-[13px] text-lx-text-secondary mt-0.5">Jouw opgeslagen spiegelconfiguraties</p>
        </div>
        <Link
          href="/configurator/nieuw"
          className="inline-flex items-center gap-2 bg-lx-cta hover:bg-lx-cta-hover text-white text-[13px] font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
          Nieuwe spiegel
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 border border-black/6 shadow-sm w-fit">
        {tabs.map((tab) => {
          const isActive = (filter ?? '') === tab.key
          return (
            <Link
              key={tab.key}
              href={tab.key ? `/configuraties?filter=${tab.key}` : '/configuraties'}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors ${
                isActive
                  ? 'bg-lx-text-primary text-white'
                  : 'text-lx-text-secondary hover:text-lx-text-primary hover:bg-lx-panel-bg'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-lx-divider text-lx-text-secondary'
                }`}>
                  {tab.count}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* Lijst */}
      <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden">
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
                <div key={config.id} className="flex items-center gap-4 px-5 py-4 hover:bg-lx-panel-bg transition-colors group">

                  {/* Shape icon */}
                  <div className="w-9 h-9 rounded-xl bg-lx-icon-bg flex items-center justify-center flex-shrink-0">
                    <ShapeIcon shape={shape} />
                  </div>

                  {/* Naam + metadata */}
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

                  {/* Prijs */}
                  <div className="text-right flex-shrink-0 w-20">
                    <p className="text-[13.5px] font-bold text-lx-text-primary">
                      €{Number(config.total_price).toLocaleString('nl-NL', { minimumFractionDigits: 0 })}
                    </p>
                    <p className="text-[10.5px] text-lx-text-secondary">excl. btw</p>
                  </div>

                  {/* Acties */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {config.status === 'ordered' ? (
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-green-50 text-green-700 border border-green-200 whitespace-nowrap">
                        Besteld
                      </span>
                    ) : (
                      <>
                        <Link
                          href={`/configurator/${config.id}`}
                          title="Bewerken"
                          className="w-7 h-7 rounded-lg hover:bg-lx-divider flex items-center justify-center text-lx-text-secondary hover:text-lx-text-primary transition-colors"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
                        </Link>
                        <DeleteButton
                          configId={config.id}
                          configName={config.name ?? 'Naamloze configuratie'}
                        />
                        {shape !== 'op-aanvraag' && (
                          <OrderButton
                            configId={config.id}
                            configName={config.name ?? 'Naamloze configuratie'}
                            metaSummary={metaParts.join(' · ')}
                            price={Number(config.total_price)}
                          />
                        )}
                      </>
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
              {filter ? `Geen ${statusLabels[filter]?.label.toLowerCase() ?? filter} configuraties` : 'Nog geen configuraties'}
            </p>
            <p className="text-[13px] text-lx-text-secondary mb-5">
              Configureer je eerste spiegel en sla hem hier op.
            </p>
            <Link
              href="/configurator/nieuw"
              className="inline-flex items-center gap-2 bg-lx-cta hover:bg-lx-cta-hover text-white text-[13px] font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              Nieuwe spiegel configureren
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
