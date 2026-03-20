import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ConfigDetailModal from './config-detail-modal'


export default async function AdminConfiguratiePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!adminProfile?.is_admin) redirect('/dashboard')

  const { status, q } = await searchParams

  // Haal alle configuraties op behalve die van de ingelogde admin
  let query = supabase
    .from('configurations')
    .select(`
      id, name, article_number, total_price, status, created_at, updated_at,
      width, height, selected_options,
      profiles:user_id (full_name, company, email)
    `)
    .neq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (status && ['draft', 'saved', 'ordered'].includes(status)) {
    query = query.eq('status', status)
  }

  const { data: configs } = await query

  // Zoekfilter client-side (op naam, klant, bedrijf)
  const filtered = configs?.filter((c) => {
    if (!q) return true
    const term = q.toLowerCase()
    const profile = c.profiles as unknown as { full_name: string | null; company: string | null; email: string } | null
    return (
      (c.name ?? '').toLowerCase().includes(term) ||
      (c.article_number ?? '').toLowerCase().includes(term) ||
      (profile?.full_name ?? '').toLowerCase().includes(term) ||
      (profile?.company ?? '').toLowerCase().includes(term)
    )
  }) ?? []

  const counts = {
    all: configs?.length ?? 0,
    draft: configs?.filter(c => c.status === 'draft').length ?? 0,
    saved: configs?.filter(c => c.status === 'saved').length ?? 0,
    ordered: configs?.filter(c => c.status === 'ordered').length ?? 0,
  }

  const tabs = [
    { key: '', label: 'Alle', count: counts.all },
    { key: 'draft', label: 'Concept', count: counts.draft },
    { key: 'saved', label: 'Opgeslagen', count: counts.saved },
    { key: 'ordered', label: 'Besteld', count: counts.ordered },
  ]

  function tabHref(key: string) {
    const params = new URLSearchParams()
    if (key) params.set('status', key)
    if (q) params.set('q', q)
    return `/admin/configuraties${params.size ? '?' + params.toString() : ''}`
  }

  return (
    <div className="p-4 sm:p-6 lg:p-7">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[20px] font-bold text-lx-text-primary tracking-tight">Klantconfiguraties</h1>
        <p className="text-[13px] text-lx-text-secondary mt-0.5">
          Alle configuraties van klanten — {counts.all} totaal
        </p>
      </div>

      {/* Zoekbalk + tabs */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">

        {/* Zoekbalk */}
        <form method="get" action="/admin/configuraties" className="relative flex-1 max-w-sm">
          {status && <input type="hidden" name="status" value={status} />}
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lx-text-secondary" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Zoek op naam, klant of bedrijf…"
            className="w-full pl-9 pr-4 py-2.5 text-[13px] rounded-xl border border-lx-border bg-white text-lx-text-primary focus:border-lx-cta focus:ring-2 focus:ring-lx-cta/10 outline-none transition-colors"
          />
        </form>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-black/6 shadow-sm w-fit">
          {tabs.map((tab) => {
            const isActive = (status ?? '') === tab.key
            return (
              <a
                key={tab.key}
                href={tabHref(tab.key)}
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
              </a>
            )
          })}
        </div>
      </div>

      {/* Lijst */}
      <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden">
        {filtered.length > 0 ? (
          <div className="divide-y divide-lx-divider">
            {filtered.map((config) => (
              <ConfigDetailModal
                key={config.id}
                config={{
                  ...config,
                  profiles: config.profiles as unknown as { full_name: string | null; company: string | null; email: string } | null,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="px-5 py-16 text-center">
            <p className="text-[14px] font-semibold text-lx-text-primary mb-1">
              {q ? `Geen resultaten voor "${q}"` : 'Geen configuraties gevonden'}
            </p>
            <p className="text-[13px] text-lx-text-secondary">
              {q ? 'Probeer een andere zoekterm.' : 'Klanten hebben nog geen configuraties aangemaakt.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
