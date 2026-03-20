import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import SearchButton from '@/components/layout/search-button'
import ChangelogModal from '@/components/dashboard/changelog-modal'
import OrderButton from '@/app/configuraties/order-button'
import NotificationBell from './notification-bell'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Goedemorgen'
  if (h < 18) return 'Goedemiddag'
  return 'Goedenavond'
}

function formatDate() {
  return new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: profile },
    { data: configs },
    { data: orders },
    { count: pendingOrderCount },
    { data: changelogs },
    { data: rssItems },
    { count: totalConfigCount },
    { data: notificationItems },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name, company, tier, notifications_read_at, price_factor, price_factor_enabled').eq('id', user.id).single(),
    supabase.from('configurations').select('id, name, article_number, total_price, status, created_at, updated_at, width, height, selected_options').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(5),
    supabase.from('orders').select('id', { count: 'exact' }).eq('user_id', user.id),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', user.id).in('status', ['pending', 'confirmed']),
    supabase.from('changelogs').select('id, title, body, published_at').order('published_at', { ascending: false }),
    supabase.from('rss_cache').select('id, title, url, summary, image_url, published_at').order('published_at', { ascending: false }).limit(4),
    supabase.from('configurations').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('notifications').select('id, title, body, type, published_at').order('published_at', { ascending: false }).limit(20),
  ])

  const firstName = profile?.full_name?.split(' ')[0] ?? 'daar'
  const company = profile?.company ?? ''
  const tier = profile?.tier ?? 'Studio'
  const priceFactor = profile?.price_factor ?? 1
  const priceFactorEnabled = profile?.price_factor_enabled ?? false

  const configCount = configs?.length ?? 0
  const savedCount = configs?.filter(c => c.status === 'saved').length ?? 0
  const orderCount = orders?.length ?? 0
  const totalConfigs = totalConfigCount ?? 0


  return (
    <div className="p-4 sm:p-6 lg:p-7 w-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-lx-text-primary tracking-tight">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-lx-text-secondary text-[13px] mt-1">
            {capitalize(formatDate())}{company ? ` · ${company}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {priceFactor > 1 && (
            <span className={`hidden sm:flex items-center gap-1.5 text-[11.5px] font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
              priceFactorEnabled
                ? 'bg-lx-icon-bg text-lx-cta border-lx-cta/20'
                : 'bg-lx-panel-bg text-lx-text-secondary border-black/8'
            }`}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M12 8v4m0 4h.01"/></svg>
              Consumentenprijzen {priceFactorEnabled ? 'actief' : 'uit'}
            </span>
          )}
          <SearchButton />
          <NotificationBell
            notifications={notificationItems ?? []}
            readAt={profile?.notifications_read_at ?? null}
          />
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-5">
        <KpiCard
          label="Actieve configuraties"
          value={configCount}
          sub={configCount > 0 ? <><span className="text-lx-cta font-medium">{savedCount} opgeslagen</span> · {configCount - savedCount} besteld</> : 'Nog geen configuraties'}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>}
          iconBg="bg-lx-icon-bg"
        />
        <KpiCard
          label="In behandeling"
          value={pendingOrderCount ?? 0}
          sub={(pendingOrderCount ?? 0) > 0 ? `${pendingOrderCount} wacht${(pendingOrderCount ?? 0) !== 1 ? 'en' : ''} op verwerking` : 'Geen openstaande bestellingen'}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
          iconBg="bg-[#FFF7ED]"
        />
        <KpiCard
          label="Bestellingen totaal"
          value={orderCount}
          sub={orderCount > 0 ? `${orderCount} order${orderCount !== 1 ? 's' : ''} geplaatst` : 'Nog geen bestellingen'}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>}
          iconBg="bg-[#EFF6FF]"
        />
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        {/* Recente configuraties */}
        <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-lx-divider">
            <span className="text-[13.5px] font-semibold text-lx-text-primary">Recente configuraties</span>
            <Link href="/configuraties" className="text-[12px] text-lx-cta font-medium hover:text-lx-cta-hover transition-colors">
              Alles bekijken →
            </Link>
          </div>

          {configs && configs.length > 0 ? (
            <div className="divide-y divide-lx-divider">
              {configs.map((config) => {
                const date = new Date(config.updated_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
                const opts = config.selected_options as Record<string, unknown> | null
                const shape = (opts?.shape as string) ?? 'rechthoek'
                const diameter = opts?.diameter as number | null
                const organicKey = opts?.organicSize as string | null
                const extras = (opts?.extras as string[]) ?? []

                let dimensionLabel = ''
                if (shape === 'rond' && diameter) dimensionLabel = `∅ ${diameter} cm`
                else if (shape === 'organic' && organicKey) dimensionLabel = organicKey.replace('x', ' × ') + ' cm'
                else if (config.width && config.height) dimensionLabel = `${config.width} × ${config.height} cm`

                const shapeLabel: Record<string, string> = {
                  rechthoek: 'Rechthoek', rond: 'Rond', organic: 'Organic', 'op-aanvraag': 'Op aanvraag'
                }

                const ShapeIcon = () => {
                  if (shape === 'rond') return (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="1.9"><circle cx="12" cy="12" r="9"/></svg>
                  )
                  if (shape === 'organic') return (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="1.9"><path d="M12 3c4 0 9 2 9 7s-3 9-7 11c-3 1-8-1-10-5S2 7 6 4c1.5-1 4-1 6-1z"/></svg>
                  )
                  if (shape === 'op-aanvraag') return (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="1.9"><rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2"/><path d="M12 8v4m0 4h.01"/></svg>
                  )
                  return (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="1.9"><rect x="3" y="5" width="18" height="14" rx="1.5"/></svg>
                  )
                }

                return (
                  <div key={config.id} className="flex items-center gap-3 px-5 py-3 hover:bg-lx-panel-bg transition-colors group">
                    <div className="w-9 h-9 rounded-lg bg-lx-icon-bg flex items-center justify-center flex-shrink-0">
                      <ShapeIcon />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="text-[13px] font-medium text-lx-text-primary truncate">
                          {config.name ?? 'Naamloze configuratie'}
                        </p>
                        {config.article_number && (
                          <span className="text-[10.5px] font-mono text-lx-text-muted flex-shrink-0">{config.article_number}</span>
                        )}
                      </div>
                      <p className="text-[11.5px] text-lx-text-secondary">
                        {shapeLabel[shape] ?? shape}{dimensionLabel ? ` · ${dimensionLabel}` : ''}{extras.length > 0 ? ` · ${extras.length} extra${extras.length !== 1 ? "'s" : ''}` : ''} · {date}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[13px] font-semibold text-lx-text-primary">
                        €{(priceFactorEnabled && priceFactor > 1
                          ? Math.round(Number(config.total_price) * priceFactor)
                          : Number(config.total_price)
                        ).toLocaleString('nl-NL', { minimumFractionDigits: 0 })}
                      </span>
                      {config.status === 'ordered' ? (
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-green-50 text-green-700 border border-green-200 whitespace-nowrap">
                          Besteld
                        </span>
                      ) : (
                        <>
                          <Link href={`/configurator/${config.id}`} title="Bewerken"
                            className="w-7 h-7 rounded-lg hover:bg-lx-divider flex items-center justify-center text-lx-text-secondary hover:text-lx-text-primary transition-colors">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
                          </Link>
                          {shape !== 'op-aanvraag' && (
                            <OrderButton
                              configId={config.id}
                              configName={config.name ?? 'Naamloze configuratie'}
                              metaSummary={`${shapeLabel[shape] ?? shape}${dimensionLabel ? ` · ${dimensionLabel}` : ''}`}
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
            <div className="px-5 py-10 text-center">
              <p className="text-[13px] text-lx-text-secondary">Nog geen configuraties</p>
              <Link href="/configurator/nieuw" className="inline-block mt-3 text-[13px] text-lx-cta font-medium hover:underline">
                Maak je eerste spiegel →
              </Link>
            </div>
          )}
        </div>

        {/* Nieuws / RSS */}
        <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-lx-divider">
            <span className="text-[13.5px] font-semibold text-lx-text-primary">Laatste nieuws</span>
            <span className="text-[12px] text-lx-text-secondary">looox.nl</span>
          </div>

          {rssItems && rssItems.length > 0 ? (
            <div className="divide-y divide-lx-divider">
              {rssItems.map((item) => {
                const date = item.published_at
                  ? new Date(item.published_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
                  : ''
                return (
                  <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 px-5 py-3 hover:bg-lx-panel-bg transition-colors">
                    {item.image_url
                      ? <Image src={item.image_url} alt="" width={64} height={64} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                      : <div className="w-16 h-16 rounded-lg bg-lx-panel-bg flex-shrink-0" />
                    }
                    <div className="min-w-0 flex-1 flex flex-col justify-center">
                      <p className="text-[13px] font-medium text-lx-text-primary leading-snug line-clamp-2">{item.title}</p>
                      <p className="text-[11.5px] text-lx-text-secondary mt-0.5">{date}</p>
                    </div>
                  </a>
                )
              })}
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <p className="text-[13px] text-lx-text-secondary">Nieuws wordt geladen via RSS</p>
              <p className="text-[11.5px] text-lx-placeholder mt-1">Elke 6 uur bijgewerkt</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: Wat's nieuw + Downloads + Snel starten */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">

        {/* Wat's nieuw */}
        <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-lx-divider">
            <span className="text-[13.5px] font-semibold text-lx-text-primary">Updates</span>
            {changelogs && changelogs.length > 4 && (
              <ChangelogModal changelogs={changelogs} />
            )}
          </div>
          {changelogs && changelogs.length > 0 ? (
            <div className="px-5 py-4 space-y-3.5">
              {changelogs.slice(0, 4).map((item) => {
                const parts = item.title.split(' — ')
                const version = parts.length > 1 && parts[0].startsWith('v') ? parts[0] : null
                const title = version ? parts.slice(1).join(' — ') : item.title
                return (
                  <div key={item.id} className="flex items-start gap-2.5">
                    <span className="text-[10px] font-bold bg-lx-icon-bg text-lx-cta px-1.5 py-0.5 rounded-md flex-shrink-0 mt-0.5 tabular-nums">
                      {version ?? '•'}
                    </span>
                    <div>
                      <p className="text-[12.5px] font-semibold text-lx-text-primary">{title}</p>
                      {item.body && <p className="text-[11.5px] text-lx-text-secondary mt-0.5 line-clamp-2 leading-relaxed">{item.body}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-5 py-8 text-center">
              <p className="text-[13px] text-lx-text-secondary">Nog geen updates</p>
            </div>
          )}
        </div>

        {/* Downloads */}
        <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-lx-divider">
            <span className="text-[13.5px] font-semibold text-lx-text-primary">Downloads</span>
          </div>
          <div className="px-5 py-4 space-y-1">
            {[
              { label: 'LoooX Catalogus 2025', ext: 'PDF', size: '12 MB' },
              { label: 'Prijslijst dealers', ext: 'PDF', size: '1.2 MB' },
              { label: 'Montage handleiding', ext: 'PDF', size: '4.5 MB' },
              { label: 'Productafbeeldingen', ext: 'ZIP', size: '68 MB' },
            ].map((dl) => (
              <a key={dl.label} href="#" className="flex items-center gap-2.5 py-2 group">
                <div className="w-7 h-7 rounded-lg bg-lx-panel-bg flex items-center justify-center flex-shrink-0">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--lx-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-lx-text-primary group-hover:text-lx-cta transition-colors truncate">{dl.label}</p>
                  <p className="text-[10.5px] text-lx-text-secondary">{dl.ext} · {dl.size}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
        {/* Snel starten */}
        <div className="bg-lx-cta rounded-[18px] overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-white/12">
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Snel starten</span>
          </div>
          <div className="px-5 py-5 flex-1 flex flex-col justify-between">
            <div>
              <p className="text-white text-[15px] font-semibold leading-snug mb-1.5">Nieuwe spiegel configureren</p>
              <p className="text-white/55 text-[12.5px] leading-relaxed">
                Kies een vorm, stel je opties in en vraag een offerte aan.
              </p>
            </div>
            <Link
              href="/configurator/nieuw"
              className="mt-5 inline-flex items-center gap-2 bg-white/15 hover:bg-white/22 text-white rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-colors self-start"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
              Configurator openen
            </Link>
          </div>
        </div>
      </div>

      {/* LoooX Circle */}
      {(() => {
        const milestones = [
          { title: 'Ontwerper',        desc: '5 configuraties',  current: totalConfigs, goal: 5,  perk: '5% introductiekorting' },
          { title: 'Eerste bestelling', desc: '1 bestelling',    current: orderCount,   goal: 1,  perk: 'Persoonlijke onboarding call' },
          { title: 'Vaste partner',    desc: '5 bestellingen',  current: orderCount,   goal: 5,  perk: 'Gratis verzending' },
          { title: 'Signature',        desc: '10 bestellingen', current: orderCount,   goal: 10, perk: '12% korting op alle orders' },
        ]
        const nextTierLabel = tier === 'Studio' ? 'Signature' : tier === 'Signature' ? 'Atelier' : null
        const ordersToNext = tier === 'Studio' ? Math.max(10 - orderCount, 0) : tier === 'Signature' ? Math.max(30 - orderCount, 0) : 0
        const progressToNext = tier === 'Studio' ? Math.min(Math.round((orderCount / 10) * 100), 100) :
                               tier === 'Signature' ? Math.min(Math.round((orderCount / 30) * 100), 100) : 100
        return (
          <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-lx-divider">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] font-semibold text-lx-text-primary">LoooX Circle</span>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-lx-icon-bg text-lx-cta">{tier}</span>
                </div>
                <Link href="/looox-circle" className="text-[12px] text-lx-cta font-medium hover:text-lx-cta-hover transition-colors">
                  Mijn voortgang →
                </Link>
              </div>
              {nextTierLabel && (
                <div className="mt-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11.5px] text-lx-text-secondary">
                      {ordersToNext === 0 ? `${nextTierLabel} bereikt` : `Nog ${ordersToNext} order${ordersToNext !== 1 ? 's' : ''} voor ${nextTierLabel}`}
                    </span>
                    <span className="text-[11.5px] font-semibold text-lx-cta">{progressToNext}%</span>
                  </div>
                  <div className="h-1.5 bg-lx-divider rounded-full overflow-hidden">
                    <div className="h-full bg-lx-cta rounded-full transition-all" style={{ width: `${progressToNext}%` }} />
                  </div>
                </div>
              )}
              {!nextTierLabel && (
                <p className="text-[12px] text-lx-cta font-medium mt-1">Hoogste niveau bereikt ✓</p>
              )}
            </div>
            {/* Milestones */}
            <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
              {milestones.map((m) => {
                const pct = Math.min(Math.round((m.current / m.goal) * 100), 100)
                const done = m.current >= m.goal
                return (
                  <div key={m.title} className="bg-lx-panel-bg rounded-[14px] p-3.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      {done ? (
                        <span className="w-3.5 h-3.5 rounded-full bg-lx-icon-bg flex items-center justify-center flex-shrink-0">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </span>
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-lx-cta/40 flex-shrink-0" />
                      )}
                      <p className={`text-[12.5px] font-semibold leading-tight ${done ? 'text-lx-cta' : 'text-lx-text-primary'}`}>{m.title}</p>
                    </div>
                    <p className="text-[11px] text-lx-text-secondary mb-2.5 ml-5">
                      {m.current}/{m.goal} {m.desc.includes('configuratie') ? 'config.' : 'order' + (m.goal !== 1 ? 's' : '')}
                    </p>
                    {!done && (
                      <div className="h-1 bg-white rounded-full overflow-hidden mb-2">
                        <div className="h-full bg-lx-cta rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                    <p className="text-[10.5px] text-lx-text-secondary leading-snug">{m.perk}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function KpiCard({ label, value, sub, icon, iconBg }: {
  label: string
  value: number
  sub: React.ReactNode
  icon: React.ReactNode
  iconBg: string
}) {
  return (
    <div className="bg-white rounded-[18px] border border-black/6 shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-2.5">{label}</p>
          <p className="text-[32px] font-bold text-lx-text-primary leading-none tracking-tight">{value}</p>
          <p className="text-[11.5px] text-lx-text-secondary mt-1.5">{sub}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
