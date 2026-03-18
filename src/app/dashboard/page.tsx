import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SearchButton from '@/components/layout/search-button'

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
    { data: changelogs },
    { data: rssItems },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name, company, tier').eq('id', user.id).single(),
    supabase.from('configurations').select('id, name, total_price, status, created_at, updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(5),
    supabase.from('orders').select('id', { count: 'exact' }).eq('user_id', user.id),
    supabase.from('changelogs').select('id, title, body, published_at').order('published_at', { ascending: false }).limit(4),
    supabase.from('rss_cache').select('id, title, url, summary, image_url, published_at').order('published_at', { ascending: false }).limit(4),
  ])

  const firstName = profile?.full_name?.split(' ')[0] ?? 'daar'
  const company = profile?.company ?? ''
  const tier = profile?.tier ?? 'Studio'

  const configCount = configs?.length ?? 0
  const conceptCount = configs?.filter(c => c.status === 'draft').length ?? 0
  const savedCount = configs?.filter(c => c.status === 'saved').length ?? 0
  const orderCount = orders?.length ?? 0

  const statusLabels: Record<string, { label: string; className: string }> = {
    draft:   { label: 'Concept',  className: 'bg-gray-100 text-[#4B5563]' },
    saved:   { label: 'Opgeslagen', className: 'bg-blue-50 text-blue-700' },
    ordered: { label: 'Besteld',  className: 'bg-green-50 text-green-700' },
  }

  return (
    <div className="p-4 sm:p-6 lg:p-7 w-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-[#1A1A1A] tracking-tight">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-[#6B7280] text-[13px] mt-1">
            {capitalize(formatDate())}{company ? ` · ${company}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <SearchButton />
          {/* Notificatie bel */}
          <button className="w-9 h-9 rounded-xl bg-white border border-black/8 shadow-sm flex items-center justify-center text-[#6B7280] hover:text-[#1A1A1A] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-5">
        <KpiCard
          label="Actieve configuraties"
          value={configCount}
          sub={configCount > 0 ? <><span className="text-[#3D6B4F] font-medium">{conceptCount} concept{conceptCount !== 1 ? 'en' : ''}</span> · {savedCount} opgeslagen</> : 'Nog geen configuraties'}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3D6B4F" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>}
          iconBg="bg-[#EFF6F1]"
        />
        <KpiCard
          label="Openstaande offertes"
          value={0}
          sub="Geen openstaande offertes"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
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
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F0EDE8]">
            <span className="text-[13.5px] font-semibold text-[#1A1A1A]">Recente configuraties</span>
            <Link href="/configuraties" className="text-[12px] text-[#3D6B4F] font-medium hover:text-[#2e5540] transition-colors">
              Alles bekijken →
            </Link>
          </div>

          {configs && configs.length > 0 ? (
            <div className="divide-y divide-[#F9F8F7]">
              {configs.map((config) => {
                const status = statusLabels[config.status] ?? statusLabels.draft
                const date = new Date(config.updated_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
                return (
                  <div key={config.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#FAFAF8] transition-colors cursor-pointer">
                    <div className="w-8 h-8 rounded-lg bg-[#EFF6F1] flex items-center justify-center flex-shrink-0">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3D6B4F" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-[#1A1A1A] truncate">
                        {config.name ?? 'Naamloze configuratie'}
                      </p>
                      <p className="text-[11.5px] text-[#6B7280]">{date}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${status.className}`}>
                        {status.label}
                      </span>
                      <span className="text-[13px] font-semibold text-[#1A1A1A]">
                        €{Number(config.total_price).toLocaleString('nl-NL', { minimumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <p className="text-[13px] text-[#9CA3AF]">Nog geen configuraties</p>
              <Link href="/configurator/nieuw" className="inline-block mt-3 text-[13px] text-[#3D6B4F] font-medium hover:underline">
                Maak je eerste spiegel →
              </Link>
            </div>
          )}
        </div>

        {/* Nieuws / RSS */}
        <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F0EDE8]">
            <span className="text-[13.5px] font-semibold text-[#1A1A1A]">Laatste nieuws</span>
            <span className="text-[12px] text-[#9CA3AF]">looox.nl</span>
          </div>

          {rssItems && rssItems.length > 0 ? (
            <div className="divide-y divide-[#F9F8F7]">
              {rssItems.map((item) => {
                const date = item.published_at
                  ? new Date(item.published_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
                  : ''
                return (
                  <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 px-5 py-3 hover:bg-[#FAFAF8] transition-colors">
                    {item.image_url
                      ? <img src={item.image_url} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                      : <div className="w-16 h-16 rounded-lg bg-[#F5F3EF] flex-shrink-0" />
                    }
                    <div className="min-w-0 flex-1 flex flex-col justify-center">
                      <p className="text-[13px] font-medium text-[#1A1A1A] leading-snug line-clamp-2">{item.title}</p>
                      <p className="text-[11.5px] text-[#9CA3AF] mt-0.5">{date}</p>
                    </div>
                  </a>
                )
              })}
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <p className="text-[13px] text-[#9CA3AF]">Nieuws wordt geladen via RSS</p>
              <p className="text-[11.5px] text-[#C4BEB7] mt-1">Elke 6 uur bijgewerkt</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: Wat's nieuw + Downloads + Snel starten */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">

        {/* Wat's nieuw */}
        <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#F0EDE8]">
            <span className="text-[13.5px] font-semibold text-[#1A1A1A]">Updates</span>
          </div>
          {changelogs && changelogs.length > 0 ? (
            <div className="px-5 py-4 space-y-3">
              {changelogs.map((item) => (
                <div key={item.id} className="flex items-start gap-2">
                  <span className="text-[#3D6B4F] mt-0.5 flex-shrink-0">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                  <div>
                    <p className="text-[12.5px] font-medium text-[#374151]">{item.title}</p>
                    {item.body && <p className="text-[11.5px] text-[#9CA3AF] mt-0.5 line-clamp-2">{item.body}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-8 text-center">
              <p className="text-[13px] text-[#9CA3AF]">Nog geen updates</p>
            </div>
          )}
        </div>

        {/* Downloads */}
        <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#F0EDE8]">
            <span className="text-[13.5px] font-semibold text-[#1A1A1A]">Downloads</span>
          </div>
          <div className="px-5 py-4 space-y-1">
            {[
              { label: 'LoooX Catalogus 2025', ext: 'PDF', size: '12 MB' },
              { label: 'Prijslijst dealers', ext: 'PDF', size: '1.2 MB' },
              { label: 'Montage handleiding', ext: 'PDF', size: '4.5 MB' },
              { label: 'Productafbeeldingen', ext: 'ZIP', size: '68 MB' },
            ].map((dl) => (
              <a key={dl.label} href="#" className="flex items-center gap-2.5 py-2 group">
                <div className="w-7 h-7 rounded-lg bg-[#F5F3EF] flex items-center justify-center flex-shrink-0">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-[#374151] group-hover:text-[#3D6B4F] transition-colors truncate">{dl.label}</p>
                  <p className="text-[10.5px] text-[#9CA3AF]">{dl.ext} · {dl.size}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
        {/* Snel starten */}
        <div className="bg-[#3D6B4F] rounded-[18px] overflow-hidden flex flex-col">
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

      {/* LoooX Circle — containerkaart met 3 milestone-kaarten erin */}
      <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#F0EDE8]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[13.5px] font-semibold text-[#1A1A1A]">LoooX Circle</span>
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                tier === 'Atelier' ? 'bg-purple-50 text-purple-700' :
                tier === 'Signature' ? 'bg-blue-50 text-blue-700' :
                'bg-[#EFF6F1] text-[#3D6B4F]'
              }`}>{tier}</span>
            </div>
            <Link href="/looox-circle" className="text-[12px] text-[#3D6B4F] font-medium hover:text-[#2e5540] transition-colors">
              Mijn voortgang →
            </Link>
          </div>
          <p className="text-[12px] text-[#9CA3AF] mt-1">
            Je bent dichtbij — zet de volgende stap en ontgrendel je voordeel.
          </p>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { title: 'Ontwerper', sub: '4/5 configuraties', pct: 80, color: 'bg-[#3D6B4F]', reward: '5% korting', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3D6B4F" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>, iconBg: 'bg-[#EFF6F1]' },
            { title: 'Vaste klant', sub: '3/5 bestellingen', pct: 60, color: 'bg-orange-400', reward: 'Gratis verzending', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>, iconBg: 'bg-orange-50' },
            { title: 'Signature tier', sub: `${orderCount}/10 orders`, pct: Math.min((orderCount / 10) * 100, 100), color: 'bg-blue-400', reward: '12% korting', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>, iconBg: 'bg-blue-50' },
          ].map((m) => (
            <div key={m.title} className="bg-[#F9F8F7] rounded-[14px] p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[13px] font-semibold text-[#1A1A1A]">{m.title}</p>
                  <p className="text-[11.5px] text-[#9CA3AF] mt-0.5">{m.sub}</p>
                </div>
                <div className={`w-9 h-9 rounded-xl ${m.iconBg} flex items-center justify-center flex-shrink-0`}>
                  {m.icon}
                </div>
              </div>
              <div className="bg-white rounded-full h-1.5 overflow-hidden mb-2">
                <div className={`${m.color} h-full rounded-full transition-all`} style={{ width: `${m.pct}%` }} />
              </div>
              <p className="text-[11px] text-[#9CA3AF]">Beloning: <span className="text-[#374151] font-medium">{m.reward}</span></p>
            </div>
          ))}
        </div>
      </div>
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
          <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-2.5">{label}</p>
          <p className="text-[32px] font-bold text-[#1A1A1A] leading-none tracking-tight">{value}</p>
          <p className="text-[11.5px] text-[#6B7280] mt-1.5">{sub}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
