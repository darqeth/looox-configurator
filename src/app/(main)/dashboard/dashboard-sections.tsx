import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCompanyUserIds } from '@/lib/company-utils'
import Link from 'next/link'
import Image from 'next/image'
import { Layers, ArrowRight } from 'lucide-react'
import NotificationBell from './notification-bell'
import { OnlinePresence } from '@/components/online-presence'
import ChangelogModal from '@/components/dashboard/changelog-modal'
import OrderButton from '@/app/(main)/configuraties/order-button'
import CopyButton from '@/components/copy-button'
import type { ConfigPreview } from '@/app/configurator/nieuw/price-panel'
import type { ShapeSlug, GlasKleur } from '@/lib/configurator-config'

// ─── Shared cached profile per request ───────────────────────────────────────

const getProfile = cache(async (userId: string) => {
  const supabase = await createClient()
  const [{ data: profile }, { data: member }] = await Promise.all([
    supabase.from('profiles')
      .select('full_name, company, notifications_read_at, is_international, is_groothandel, korting, is_admin, is_sub_admin')
      .eq('id', userId).single(),
    supabase.from('company_members')
      .select('company_id, role, can_order')
      .eq('user_id', userId).maybeSingle(),
  ])
  return {
    profile,
    member,
    isInternational: profile?.is_international ?? false,
    isGroothandel: profile?.is_groothandel ?? false,
    korting: profile?.korting ?? 50,
    canOrder: !member || member.role === 'manager' || (member?.can_order ?? true),
    companyId: member?.company_id ?? null,
    firstName: profile?.full_name?.split(' ')[0] ?? 'daar',
    company: profile?.company ?? '',
  }
})

// ─── Gedeelde gecachte globale data ───────────────────────────────────────────
// RSS, changelogs en downloads zijn identiek voor alle gebruikers en wijzigen
// zelden — cachen scheelt 3-4 queries per dashboard-load. Admin-client omdat
// unstable_cache geen cookies mag lezen; het is uitsluitend read-only data.

const getCachedRssItems = unstable_cache(
  async () => {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('rss_cache').select('id, title, url, summary, image_url, published_at')
      .order('published_at', { ascending: false }).limit(4)
    return data ?? []
  },
  ['dashboard-rss'],
  { revalidate: 1800, tags: ['rss'] }
)

const getCachedChangelogs = unstable_cache(
  async () => {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('changelogs').select('id, title, body, published_at')
      .order('published_at', { ascending: false }).limit(20)
    return data ?? []
  },
  ['dashboard-changelogs'],
  { revalidate: 300, tags: ['changelogs'] }
)

const getCachedDownloads = unstable_cache(
  async () => {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('downloads').select('id, title, file_url, file_ext, file_size')
      .eq('is_active', true).order('sort_order').limit(6)
    return data ?? []
  },
  ['dashboard-downloads'],
  { revalidate: 300, tags: ['downloads'] }
)

// ─── Skeletons ────────────────────────────────────────────────────────────────

export function HeaderSkeleton() {
  return (
    <div className="flex items-center justify-between mb-6 gap-4">
      <div>
        <div className="h-7 w-48 bg-lx-divider rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-64 bg-lx-divider rounded animate-pulse" />
      </div>
    </div>
  )
}

export function KpiRowSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-[18px] border border-black/6 shadow-sm p-5 animate-pulse">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="h-3 w-28 bg-lx-divider rounded" />
              <div className="h-8 w-12 bg-lx-divider rounded" />
              <div className="h-3 w-36 bg-lx-divider rounded" />
            </div>
            <div className="w-10 h-10 rounded-xl bg-lx-divider" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ConfigRowsSkeleton() {
  return (
    <div className="divide-y divide-lx-divider animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-3">
          <div className="w-9 h-9 rounded-lg bg-lx-divider flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-40 bg-lx-divider rounded" />
            <div className="h-3 w-56 bg-lx-divider rounded" />
          </div>
          <div className="h-5 w-16 bg-lx-divider rounded" />
        </div>
      ))}
    </div>
  )
}

export function NewsRowsSkeleton() {
  return (
    <div className="divide-y divide-lx-divider animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-3">
          <div className="w-16 h-16 rounded-lg bg-lx-divider flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-3/4 bg-lx-divider rounded" />
            <div className="h-3 w-1/2 bg-lx-divider rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function UpdatesRowsSkeleton() {
  return (
    <div className="px-5 py-4 space-y-3.5 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <div className="h-5 w-8 bg-lx-divider rounded-md flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-3/4 bg-lx-divider rounded" />
            <div className="h-3 w-full bg-lx-divider rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function DownloadsRowsSkeleton() {
  return (
    <div className="px-3 py-2 space-y-0.5 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5 px-2 py-2">
          <div className="w-7 h-7 rounded-lg bg-lx-divider flex-shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="h-3.5 w-3/4 bg-lx-divider rounded" />
            <div className="h-2.5 w-1/4 bg-lx-divider rounded" />
          </div>
          <div className="h-4 w-8 bg-lx-divider rounded-md" />
        </div>
      ))}
    </div>
  )
}

export function CircleSkeleton() {
  return (
    <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden animate-pulse">
      <div className="px-5 py-3.5 border-b border-lx-divider flex items-center justify-between">
        <div className="h-4 w-32 bg-lx-divider rounded" />
        <div className="h-4 w-24 bg-lx-divider rounded" />
      </div>
      <div className="divide-y divide-lx-divider">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3">
            <div className="w-5 h-5 rounded-full bg-lx-divider flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-40 bg-lx-divider rounded" />
              <div className="h-3 w-24 bg-lx-divider rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Goedemorgen'
  if (h < 18) return 'Goedemiddag'
  return 'Goedenavond'
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatDate() {
  return new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Header ───────────────────────────────────────────────────────────────────

export async function DashboardHeader({ userId }: { userId: string }) {
  const supabase = await createClient()
  const [{ firstName, company, profile }, { data: notifications }] = await Promise.all([
    getProfile(userId),
    supabase.from('notifications').select('id, title, body, type, published_at').order('published_at', { ascending: false }).limit(20),
  ])

  return (
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
        {(profile?.is_admin || profile?.is_sub_admin) && (
          <OnlinePresence isStaff showBadge />
        )}
        <NotificationBell
          notifications={(notifications ?? []) as Parameters<typeof NotificationBell>[0]['notifications']}
          readAt={profile?.notifications_read_at ?? null}
        />
      </div>
    </div>
  )
}

// ─── KPI row ──────────────────────────────────────────────────────────────────

export async function KpiRow({ userId }: { userId: string }) {
  const supabase = await createClient()
  const { korting: _korting, canOrder: _canOrder } = await getProfile(userId)

  const [
    { count: totalCount },
    { data: configStatuses },
    { count: pendingCount },
    { data: ownOrders },
  ] = await Promise.all([
    supabase.from('configurations').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('configurations').select('status').eq('user_id', userId).in('status', ['saved', 'ordered']).limit(500),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', userId).in('status', ['pending', 'confirmed']),
    supabase.from('orders').select('total_price').eq('user_id', userId),
  ])

  const total = totalCount ?? 0
  const savedCount = configStatuses?.filter(c => c.status === 'saved').length ?? 0
  const orderedCount = configStatuses?.filter(c => c.status === 'ordered').length ?? 0
  const revenueSum = (ownOrders ?? []).reduce((sum, o) => sum + Number(o.total_price), 0)
  const pending = pendingCount ?? 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-5">
      <Link href="/configuraties" className="block bg-white rounded-[18px] border border-black/6 shadow-sm p-5 hover:shadow-md hover:border-black/10 transition-all">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-2.5">Configuraties</p>
            <p className="text-[32px] font-bold text-lx-text-primary leading-none tracking-tight">{total}</p>
            <p className="text-[11.5px] text-lx-text-secondary mt-1.5">
              {total > 0
                ? <><span className="text-lx-cta font-medium">{savedCount} opgeslagen</span>{orderedCount > 0 ? <> · {orderedCount} besteld</> : null}</>
                : 'Maak je eerste configuratie'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-lx-icon-bg flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </div>
        </div>
      </Link>

      <Link href="/bestellingen" className="block bg-white rounded-[18px] border border-black/6 shadow-sm p-5 hover:shadow-md hover:border-black/10 transition-all">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-2.5">In behandeling</p>
            <p className="text-[32px] font-bold text-lx-text-primary leading-none tracking-tight">{pending}</p>
            <p className="text-[11.5px] text-lx-text-secondary mt-1.5">
              {pending > 0 ? 'Wacht op verwerking bij LoooX' : 'Geen openstaande bestellingen'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
        </div>
      </Link>

      <Link href="/bestellingen" className="block bg-white rounded-[18px] border border-black/6 shadow-sm p-5 hover:shadow-md hover:border-black/10 transition-all">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-2.5">Totale omzet</p>
            <p className="text-[32px] font-bold text-lx-text-primary leading-none tracking-tight">€&nbsp;{revenueSum.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}</p>
            <p className="text-[11.5px] text-lx-text-secondary mt-1.5">
              {revenueSum > 0 ? 'Netto inkoopprijs · excl. BTW' : 'Nog geen bestellingen geplaatst'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 76.6 86.2" fill="#2563EB" stroke="#2563EB" strokeWidth="3" strokeLinejoin="round"><path d="M75.7,9c0-2.5-2.5-4.6-7.2-6.1-4.3-1.4-9.9-2.1-15.9-2.1s-11.6.8-15.9,2.1c-4.7,1.5-7.2,3.6-7.2,6.1v16.8c-1.6-.1-3.3-.2-5-.2-6,0-11.6.8-15.9,2.1-4.7,1.5-7.2,3.6-7.2,6.1v21c0,.2,0,.4,0,.6,0,.1,0,.2,0,.3v21c0,2.5,2.5,4.6,7.2,6.1,4.3,1.4,9.9,2.1,15.9,2.1s11.6-.8,15.9-2.1c4.7-1.5,7.2-3.6,7.2-6.1v-6.8c1.6.1,3.3.2,5,.2,6,0,11.6-.8,15.9-2.1,4.7-1.5,7.2-3.6,7.2-6.1v-31.1c0-.1,0-.2,0-.3,0-.2,0-.4,0-.6V9ZM47.6,49c1.6.1,3.3.2,5,.2,6,0,11.6-.8,15.9-2.1,2-.7,3.7-1.4,4.9-2.3v7.2c0,2.4-7.9,5.8-20.7,5.8s-3.4,0-5-.2v-8.6ZM73.4,41c0,2.4-7.9,5.8-20.7,5.8s-3.4,0-5-.2v-1.8c0-.1,0-.2,0-.3,0-.2,0-.4,0-.6v-5.9c1.6.1,3.3.2,5,.2,6,0,11.6-.8,15.9-2.1,2.1-.7,3.7-1.4,4.9-2.3v7.2ZM31.9,12.8c1.2.9,2.8,1.6,4.9,2.3,4.3,1.4,9.9,2.1,15.9,2.1s11.6-.8,15.9-2.1c2.1-.7,3.7-1.4,4.9-2.3v6.2c0,2.4-7.9,5.8-20.7,5.8s-20.7-3.4-20.7-5.8v-6.2ZM52.6,3.1c12.9,0,20.7,3.4,20.7,5.8s-7.9,5.8-20.7,5.8-20.7-3.4-20.7-5.8,7.9-5.8,20.7-5.8ZM31.9,22.8c1.2.9,2.8,1.6,4.9,2.3,4.3,1.4,9.9,2.1,15.9,2.1s11.6-.8,15.9-2.1c2-.7,3.7-1.4,4.9-2.3v7.2c0,2.4-7.9,5.8-20.7,5.8s-3.4,0-5-.2v-1.8c0-2.5-2.5-4.6-7.2-6.1-2.4-.8-5.3-1.4-8.5-1.7v-3.2ZM24.5,28c12.9,0,20.7,3.4,20.7,5.8s-7.9,5.8-20.7,5.8-20.7-3.4-20.7-5.8,7.9-5.8,20.7-5.8ZM45.3,76.8c0,2.4-7.9,5.8-20.7,5.8s-20.7-3.4-20.7-5.8v-7.2c1.2.9,2.8,1.6,4.9,2.3,4.3,1.4,9.9,2.1,15.9,2.1s11.6-.8,15.9-2.1c2-.7,3.7-1.4,4.9-2.3v7.2ZM45.3,65.9c0,2.4-7.9,5.8-20.7,5.8s-20.7-3.4-20.7-5.8v-7.2c1.2.9,2.8,1.6,4.9,2.3,4.3,1.4,9.9,2.1,15.9,2.1s11.6-.8,15.9-2.1c2-.7,3.7-1.4,4.9-2.3v7.2ZM45.3,54.9c0,2.4-7.9,5.8-20.7,5.8s-20.7-3.4-20.7-5.8v-7.2c1.2.9,2.8,1.6,4.9,2.3,4.3,1.4,9.9,2.1,15.9,2.1s11.6-.8,15.9-2.1c2-.7,3.7-1.4,4.9-2.3v7.2ZM24.5,49.7c-12.9,0-20.7-3.4-20.7-5.8v-6.2c1.2.9,2.8,1.6,4.9,2.3,4.3,1.4,9.9,2.1,15.9,2.1s11.6-.8,15.9-2.1c2.1-.7,3.7-1.4,4.9-2.3v6.2c0,2.4-7.9,5.8-20.7,5.8ZM52.6,67.9c-1.7,0-3.4,0-5-.2v-.9c0-.1,0-.2,0-.3,0-.2,0-.4,0-.6v-5.9c1.6.1,3.3.2,5,.2,6,0,11.6-.8,15.9-2.1,2.1-.7,3.7-1.4,4.9-2.3v6.2c0,2.4-7.9,5.8-20.7,5.8Z"/></svg>
          </div>
        </div>
      </Link>
    </div>
  )
}

// ─── Recent configs rows ───────────────────────────────────────────────────────

export async function RecentConfigsRows({ userId }: { userId: string }) {
  const supabase = await createClient()
  const [{ korting, canOrder }, { data: configs }] = await Promise.all([
    getProfile(userId),
    supabase.from('configurations')
      .select('id, name, article_number, total_price, status, created_at, updated_at, width, height, selected_options')
      .eq('user_id', userId).order('updated_at', { ascending: false }).limit(5),
  ])

  if (!configs || configs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
        <div className="w-11 h-11 rounded-2xl bg-lx-icon-bg flex items-center justify-center">
          <Layers className="w-5 h-5 text-lx-cta" />
        </div>
        <div>
          <p className="text-[13.5px] font-semibold text-lx-text-primary">Nog geen configuraties</p>
          <p className="text-[12px] text-lx-text-secondary mt-0.5">Maak je eerste spiegel aan om te beginnen.</p>
        </div>
        <Link href="/configurator/nieuw" className="bg-lx-cta hover:bg-lx-cta-hover text-white text-[13px] font-semibold px-4 py-2 rounded-xl transition-colors inline-flex items-center gap-1.5">
          Nieuwe spiegel <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    )
  }

  const shapeLabelMap: Record<string, string> = { rechthoek: 'Rechthoek', rond: 'Rond', organic: 'Organic', 'op-aanvraag': 'Op aanvraag', 'rounded-rect': 'Afgerond', ovaal: 'Ovaal', arc: 'Boog', sol: 'Sol', luna: 'Luna' }

  return (
    <div className="divide-y divide-lx-divider">
      {configs.map((config) => {
        const date = new Date(config.updated_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
        const opts = config.selected_options as Record<string, unknown> | null
        const shape = (opts?.shape as string) ?? 'rechthoek'
        const diameter = opts?.diameter as number | null
        const organicKey = opts?.organicSize as string | null
        const extras = (opts?.extras as string[]) ?? []
        const direct = opts?.directLight as { position: string; type?: string | null } | null
        const indirect = opts?.indirectLight as { position: string; type?: string | null } | null
        const configPreview: ConfigPreview | undefined = shape && shape !== 'projectspiegel' ? {
          shape: shape as ShapeSlug,
          width: config.width ?? null,
          height: config.height ?? null,
          diameter: diameter ?? null,
          organicSizeKey: organicKey ?? null,
          glasKleur: opts?.glasKleur as GlasKleur | null ?? null,
          directLight: direct ? { position: direct.position, type: direct.type ?? null } : undefined,
          indirectLight: indirect ? { position: indirect.position, type: indirect.type ?? null } : undefined,
          extras: extras.length > 0 ? extras : undefined,
        } : undefined
        let dimensionLabel = ''
        if (shape === 'rond' && diameter) dimensionLabel = `∅ ${diameter} cm`
        else if (shape === 'organic' && organicKey) dimensionLabel = organicKey.replace('x', ' × ') + ' cm'
        else if (config.width && config.height) dimensionLabel = `${config.width} × ${config.height} cm`

        return (
          <div key={config.id} className="flex items-center gap-3 px-5 py-3 hover:bg-lx-panel-bg transition-colors group">
            <div className="w-9 h-9 rounded-lg bg-lx-icon-bg flex items-center justify-center flex-shrink-0">
              <img src={`/icons/shapes/${shape}.svg`} width="15" height="15" alt="" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <p className="text-[13px] font-medium text-lx-text-primary truncate">{config.name ?? 'Naamloze configuratie'}</p>
                {config.article_number && <span className="text-[10.5px] font-mono text-lx-text-muted flex-shrink-0">{config.article_number}</span>}
              </div>
              <p className="text-[11.5px] text-lx-text-secondary">
                {shapeLabelMap[shape] ?? shape}{dimensionLabel ? ` · ${dimensionLabel}` : ''}{extras.length > 0 ? ` · ${extras.length} extra${extras.length !== 1 ? "'s" : ''}` : ''} · {date}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[13px] font-semibold text-lx-text-primary">
                €{Number(config.total_price).toLocaleString('nl-NL', { minimumFractionDigits: 0 })}
              </span>
              {config.status === 'ordered' ? (
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-green-50 text-green-700 border border-green-200 whitespace-nowrap">Besteld</span>
              ) : (
                <>
                  <Link href={`/configurator/${config.id}`} title="Bewerken" className="w-7 h-7 rounded-lg hover:bg-lx-divider flex items-center justify-center text-lx-text-secondary hover:text-lx-text-primary transition-colors">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
                  </Link>
                  {shape !== 'op-aanvraag' && canOrder && (
                    <OrderButton configId={config.id} configName={config.name ?? 'Naamloze configuratie'} metaSummary={`${shapeLabelMap[shape] ?? shape}${dimensionLabel ? ` · ${dimensionLabel}` : ''}`} price={Number(config.total_price)} korting={korting} configPreview={configPreview} />
                  )}
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── News rows ────────────────────────────────────────────────────────────────

export async function NewsRows() {
  const rssItems = await getCachedRssItems()

  if (!rssItems || rssItems.length === 0) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="text-[13px] text-lx-text-secondary">Nieuws wordt geladen via RSS</p>
        <p className="text-[11.5px] text-lx-placeholder mt-1">Elke 6 uur bijgewerkt</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-lx-divider">
      {rssItems.map((item) => {
        const date = item.published_at ? new Date(item.published_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) : ''
        return (
          <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-5 py-3 hover:bg-lx-panel-bg transition-colors">
            {item.image_url
              ? <Image src={item.image_url} alt="" width={64} height={64} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
              : <div className="w-16 h-16 rounded-lg bg-lx-panel-bg flex-shrink-0" />}
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <p className="text-[13px] font-medium text-lx-text-primary leading-snug line-clamp-2">{item.title}</p>
              <p className="text-[11.5px] text-lx-text-secondary mt-0.5">{date}</p>
            </div>
          </a>
        )
      })}
    </div>
  )
}

// ─── Updates rows (incl. ChangelogModal in header) ────────────────────────────

export async function UpdatesHeaderExtra() {
  const changelogs = await getCachedChangelogs()

  if (!changelogs || changelogs.length <= 4) return null
  return <ChangelogModal changelogs={changelogs.map(c => ({ ...c, body: c.body ?? '' }))} />
}

export async function UpdatesRows() {
  const changelogs = await getCachedChangelogs()

  if (!changelogs || changelogs.length === 0) {
    return <div className="px-5 py-8 text-center"><p className="text-[13px] text-lx-text-secondary">Nog geen updates</p></div>
  }

  return (
    <div className="px-5 py-4 space-y-3.5">
      {changelogs.slice(0, 4).map((item) => {
        const parts = item.title.split(' — ')
        const version = parts.length > 1 && /^v?\d/.test(parts[0]) ? parts[0] : null
        const title = version ? parts.slice(1).join(' — ') : item.title
        return (
          <div key={item.id} className="flex items-start gap-2.5">
            <span className="text-[10px] font-bold bg-lx-icon-bg text-lx-cta px-1.5 py-0.5 rounded-md flex-shrink-0 mt-0.5 tabular-nums">{version ?? '•'}</span>
            <div>
              <p className="text-[12.5px] font-semibold text-lx-text-primary">{title}</p>
              {item.body && <p className="text-[11.5px] text-lx-text-secondary mt-0.5 line-clamp-2 leading-relaxed">{item.body}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Downloads rows ───────────────────────────────────────────────────────────

export async function DownloadsRows() {
  const downloads = await getCachedDownloads()

  if (!downloads || downloads.length === 0) {
    return <div className="px-5 py-8 text-center"><p className="text-[12.5px] text-lx-text-secondary">Nog geen downloads beschikbaar</p></div>
  }

  const extColors: Record<string, string> = {
    PDF: 'bg-red-50 text-red-600', ZIP: 'bg-blue-50 text-blue-600',
    DOCX: 'bg-sky-50 text-sky-600', XLSX: 'bg-green-50 text-green-700',
    DWG: 'bg-orange-50 text-orange-600', AI: 'bg-amber-50 text-amber-700',
    EPS: 'bg-purple-50 text-purple-600',
  }

  return (
    <div className="px-3 py-2 space-y-0.5">
      {downloads.map((dl) => (
        <a key={dl.id} href={dl.file_url} download target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-lx-panel-bg transition-colors group cursor-pointer">
          <div className="w-7 h-7 rounded-lg bg-lx-panel-bg group-hover:bg-lx-icon-bg flex items-center justify-center flex-shrink-0 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60 group-hover:opacity-100 transition-opacity"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-lx-text-primary group-hover:text-lx-cta transition-colors truncate leading-snug">{dl.title}</p>
            {dl.file_size && <p className="text-[10.5px] text-lx-text-muted">{dl.file_size}</p>}
          </div>
          <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${extColors[dl.file_ext] ?? 'bg-lx-panel-bg text-lx-text-secondary'}`}>
            {dl.file_ext}
          </span>
        </a>
      ))}
    </div>
  )
}

// ─── Snel starten (100% static) ───────────────────────────────────────────────

export function SnelStartenCard() {
  return (
    <div className="bg-lx-cta rounded-[18px] overflow-hidden flex flex-col">
      <div className="px-5 py-3.5 border-b border-white/12">
        <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Snel starten</span>
      </div>
      <div className="px-5 py-5 flex-1 flex flex-col justify-between">
        <div>
          <p className="text-white text-[15px] font-semibold leading-snug mb-1.5">Nieuwe spiegel configureren</p>
          <p className="text-white/55 text-[12.5px] leading-relaxed">Kies een vorm, stel je opties in en vraag een offerte aan.</p>
        </div>
        <Link href="/configurator/nieuw" className="mt-5 inline-flex items-center gap-2 bg-white/15 hover:bg-white/22 text-white rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-colors self-start">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
          Configurator openen
        </Link>
      </div>
    </div>
  )
}

// ─── LoooX Circle section ─────────────────────────────────────────────────────

export async function CircleSection({ userId }: { userId: string }) {
  const supabase = await createClient()
  const { isInternational, isGroothandel, companyId, korting: _korting } = await getProfile(userId)
  if (isInternational || isGroothandel) return null

  const companyUserIds = await getCompanyUserIds(supabase, userId, companyId)

  const [
    { data: circleMilestones },
    { data: userMilestonesData },
    { data: companyMilestonesData },
    { data: companyConfigCount },
    { data: companyOrderCount },
    { data: streakData },
    { data: usedDiscountCodes },
    { data: ownOrders },
  ] = await Promise.all([
    supabase.from('milestones').select('id, title, goal_type, goal_value, benefit_type, benefit_value, benefit_description').eq('is_active', true).order('sort_order'),
    supabase.from('user_milestones').select('id, milestone_id, achieved_at, claimed_at, discount_code').eq('user_id', userId),
    supabase.from('user_milestones').select('milestone_id').in('user_id', companyUserIds),
    supabase.rpc('count_company_configs', { p_user_id: userId }),
    supabase.rpc('count_company_orders', { p_user_id: userId }),
    supabase.from('login_streaks').select('current_streak').eq('user_id', userId).single(),
    supabase.from('discount_codes').select('code').eq('user_id', userId).not('used_at', 'is', null).limit(50),
    supabase.from('orders').select('total_price').eq('user_id', userId),
  ])

  if (!circleMilestones?.length) return null

  const revenueSum = (ownOrders ?? []).reduce((sum, o) => sum + Number(o.total_price), 0)
  const currentStreak = streakData?.current_streak ?? 0
  const usedCodesSet = new Set((usedDiscountCodes ?? []).map(c => c.code as string))
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const companyAchievedIds = new Set((companyMilestonesData ?? []).map(m => m.milestone_id as string))
  const userMilestoneMap = Object.fromEntries(
    (userMilestonesData ?? []).map(um => [
      um.milestone_id,
      { id: um.id as string, achieved_at: um.achieved_at as string | null, claimed_at: um.claimed_at as string | null, discount_code: um.discount_code as string | null },
    ])
  )
  const currentByType: Record<string, number> = {
    configs: Number(companyConfigCount ?? 0),
    orders: Number(companyOrderCount ?? 0),
    order_revenue: revenueSum,
    streak: currentStreak,
  }

  type RawMilestone = { id: string; title: string; goal_type: string; goal_value: number; benefit_type: string; benefit_value: number | null; benefit_description: string | null }
  const enriched = (circleMilestones as RawMilestone[]).map(m => {
    const um = userMilestoneMap[m.id]
    const done = companyAchievedIds.has(m.id) || !!um?.achieved_at || (m.goal_type !== 'shape' && (currentByType[m.goal_type] ?? 0) >= m.goal_value)
    const isRecent = done && !!um?.achieved_at && new Date(um.achieved_at).getTime() > sevenDaysAgo
    const current = currentByType[m.goal_type] ?? 0
    const pct = done ? 100 : Math.min(Math.round((current / m.goal_value) * 100), 99)
    const isCodeUsed = um?.discount_code ? usedCodesSet.has(um.discount_code) : false
    return { ...m, done, isRecent, claimedAt: um?.claimed_at ?? null, umId: um?.id ?? null, discountCode: um?.discount_code ?? null, isCodeUsed, current, pct }
  })

  const doneCount = enriched.filter(m => m.done).length
  const total = enriched.length
  const overallPct = total > 0 ? Math.round((doneCount / total) * 100) : 0
  const hasAction = (m: typeof enriched[0]) =>
    ((m.benefit_type === 'discount_pct' || m.benefit_type === 'discount_fixed') && !m.isCodeUsed && !!m.discountCode) ||
    (m.benefit_type === 'custom' && !m.claimedAt && !!m.umId)
  const achieved = enriched.filter(m => m.done)
    .sort((a, b) => {
      if (a.isRecent !== b.isRecent) return a.isRecent ? -1 : 1
      return Number(hasAction(b)) - Number(hasAction(a))
    })
    .slice(0, 4)
  const upcoming = enriched.filter(m => !m.done && m.goal_type !== 'shape').sort((a, b) => b.pct - a.pct).slice(0, Math.max(0, 6 - achieved.length))

  return (
    <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-lx-divider flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] font-semibold text-lx-text-primary">LoooX Circle</span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-lx-icon-bg text-lx-cta tabular-nums">{doneCount} van {total}</span>
        </div>
        <Link href="/looox-circle" className="text-[12px] text-lx-cta font-medium hover:text-lx-cta-hover transition-colors">Mijn voortgang →</Link>
      </div>

      <div className="px-5 py-3 border-b border-lx-divider">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-lx-text-secondary">
            {doneCount === total ? 'Alle mijlpalen behaald' : `${total - doneCount} mijlpa${total - doneCount === 1 ? 'al' : 'len'} te gaan`}
          </span>
          <span className="text-[11px] font-semibold text-lx-cta tabular-nums">{overallPct}%</span>
        </div>
        <div className="h-1.5 bg-lx-divider rounded-full overflow-hidden">
          <div className="h-full bg-lx-cta rounded-full transition-all duration-500" style={{ width: `${overallPct}%` }} />
        </div>
      </div>

      <div className="divide-y divide-lx-divider">
        {achieved.map(m => {
          const benefitLabel = m.benefit_type === 'discount_pct' ? `${m.benefit_value}% korting` : m.benefit_type === 'discount_fixed' ? `€${m.benefit_value} korting` : m.benefit_type === 'custom' ? (m.benefit_description ?? null) : null
          return (
            <div key={m.id} className="flex items-center gap-3 px-5 py-3">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${m.isRecent ? 'bg-lx-cta border-2 border-lx-cta' : 'border-2 border-lx-cta/60 bg-lx-icon-bg'}`}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={m.isRecent ? 'white' : 'var(--lx-cta)'} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[13px] font-medium text-lx-text-primary truncate">{m.title}</p>
                  {m.isRecent && <span className="text-[10px] font-semibold bg-lx-icon-bg text-lx-cta px-2 py-0.5 rounded-full flex-shrink-0">Nieuw</span>}
                </div>
                {benefitLabel && <p className="text-[11px] text-lx-cta font-medium truncate">{benefitLabel}</p>}
              </div>
              {(m.benefit_type === 'discount_pct' || m.benefit_type === 'discount_fixed') && m.discountCode ? (
                m.isCodeUsed
                  ? <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-lx-panel-bg text-lx-text-secondary text-[11px] font-mono tracking-widest line-through flex-shrink-0">{m.discountCode}</span>
                  : <CopyButton text={m.discountCode} label="kortingscode" />
              ) : m.benefit_type === 'custom' && m.umId && !m.claimedAt ? (
                <a href={`/api/pdf/milestone/${m.umId}`} download className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-lx-icon-bg hover:bg-lx-divider text-lx-cta text-[11px] font-semibold transition-colors flex-shrink-0">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download
                </a>
              ) : null}
            </div>
          )
        })}

        {upcoming.map(m => {
          const v = m.goal_value; const c = Math.min(m.current, v)
          const progressLabel = m.goal_type === 'configs' ? `${c} van ${v} config${v !== 1 ? 's' : ''}` : m.goal_type === 'orders' ? `${c} van ${v} order${v !== 1 ? 's' : ''}` : m.goal_type === 'order_revenue' ? `€${Math.round(c / 1000 * 10) / 10}k van €${Math.round(v / 1000)}k` : m.goal_type === 'streak' ? `${c} van ${v} dag${v !== 1 ? 'en' : ''}` : ''
          const benefitLabel = m.benefit_type === 'discount_pct' ? `${m.benefit_value}% korting` : m.benefit_type === 'discount_fixed' ? `€${m.benefit_value} korting` : (m.benefit_description ?? null)
          const circ = 44; const dash = Math.round((m.pct / 100) * circ)
          return (
            <div key={m.id} className="flex items-center gap-3 px-5 py-3">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="flex-shrink-0 -rotate-90">
                <circle cx="9" cy="9" r="7" stroke="var(--lx-divider)" strokeWidth="2.5"/>
                <circle cx="9" cy="9" r="7" stroke="var(--lx-cta)" strokeWidth="2.5" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" opacity={m.pct === 0 ? 0 : 1}/>
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-lx-text-primary truncate">{m.title}</p>
                {benefitLabel && <p className="text-[11px] text-lx-text-secondary truncate">{benefitLabel}</p>}
              </div>
              <div className="flex items-center gap-2.5 flex-shrink-0">
                {progressLabel && <span className="text-[11px] text-lx-text-secondary tabular-nums">{progressLabel}</span>}
                {m.pct > 0 && <div className="w-14 h-1.5 bg-lx-divider rounded-full overflow-hidden"><div className="h-full bg-lx-cta rounded-full" style={{ width: `${m.pct}%` }} /></div>}
              </div>
            </div>
          )
        })}

        <div className="flex items-center justify-center px-5 py-3">
          <Link href="/looox-circle" className="text-[12px] text-lx-cta font-medium hover:underline">Bekijk alle mijlpalen →</Link>
        </div>
      </div>
    </div>
  )
}
