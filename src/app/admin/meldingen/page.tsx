import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/company-utils'
import { redirect } from 'next/navigation'
import CreateNotificationForm from './create-form'
import DeleteNotificationButton from './delete-button'
import CreateChangelogForm from './create-changelog-form'
import DeleteChangelogButton from './delete-changelog-button'
import MeldingenTabs from './meldingen-tabs'

const TYPE_LABELS: Record<string, { label: string; style: string }> = {
  feature: { label: 'Nieuw', style: 'bg-lx-icon-bg text-lx-cta' },
  promo:   { label: 'Actie', style: 'bg-amber-50 text-amber-700' },
  info:    { label: 'Info',  style: 'bg-blue-50 text-blue-700' },
}

export default async function AdminMeldingenPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!await isAdmin(supabase, user.id)) redirect('/dashboard')

  const { tab } = await searchParams
  const activeTab = tab === 'updates' ? 'updates' : 'meldingen'

  const [
    { data: notifications },
    { data: changelogs },
  ] = await Promise.all([
    supabase.from('notifications').select('id, title, body, type, published_at').order('published_at', { ascending: false }),
    supabase.from('changelogs').select('id, title, body, published_at').order('published_at', { ascending: false }),
  ])

  return (
    <div className="p-4 sm:p-6 lg:p-7 w-full max-w-3xl">
      <h1 className="text-[20px] font-bold text-lx-text-primary mb-1">Communicatie</h1>
      <p className="text-[13px] text-lx-text-secondary mb-5">
        Beheer meldingen en updates die zichtbaar zijn op het dashboard.
      </p>

      <MeldingenTabs active={activeTab} />

      {activeTab === 'meldingen' ? (
        <>
          <CreateNotificationForm />

          <div className="mt-8">
            <p className="text-[12px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-3">
              Gepubliceerde meldingen ({notifications?.length ?? 0})
            </p>
            <div className="space-y-2">
              {notifications && notifications.length > 0 ? notifications.map((n) => {
                const cfg = TYPE_LABELS[n.type] ?? TYPE_LABELS.info
                const date = new Date(n.published_at).toLocaleDateString('nl-NL', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })
                return (
                  <div key={n.id} className="bg-white rounded-xl border border-black/8 px-4 py-3.5 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${cfg.style}`}>{cfg.label}</span>
                        <span className="text-[11px] text-lx-text-muted">{date}</span>
                      </div>
                      <p className="text-[13.5px] font-semibold text-lx-text-primary">{n.title}</p>
                      {n.body && <p className="text-[12px] text-lx-text-secondary mt-0.5 leading-relaxed">{n.body}</p>}
                    </div>
                    <DeleteNotificationButton id={n.id} />
                  </div>
                )
              }) : (
                <p className="text-[13px] text-lx-text-secondary py-6 text-center">Nog geen meldingen aangemaakt.</p>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <CreateChangelogForm />

          <div className="mt-8">
            <p className="text-[12px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-3">
              Geplaatste updates ({changelogs?.length ?? 0})
            </p>
            <div className="space-y-2">
              {changelogs && changelogs.length > 0 ? changelogs.map((item) => {
                const parts = item.title.split(' — ')
                const version = parts.length > 1 && parts[0].startsWith('v') ? parts[0] : null
                const title = version ? parts.slice(1).join(' — ') : item.title
                const date = new Date(item.published_at).toLocaleDateString('nl-NL', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })
                return (
                  <div key={item.id} className="bg-white rounded-xl border border-black/8 px-4 py-3.5 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {version && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-lx-icon-bg text-lx-cta tabular-nums">{version}</span>
                        )}
                        <span className="text-[11px] text-lx-text-muted">{date}</span>
                      </div>
                      <p className="text-[13.5px] font-semibold text-lx-text-primary">{title}</p>
                      {item.body && <p className="text-[12px] text-lx-text-secondary mt-0.5 leading-relaxed">{item.body}</p>}
                    </div>
                    <DeleteChangelogButton id={item.id} />
                  </div>
                )
              }) : (
                <p className="text-[13px] text-lx-text-secondary py-6 text-center">Nog geen updates geplaatst.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
