import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreateNotificationForm from './create-form'
import DeleteNotificationButton from './delete-button'

const TYPE_LABELS: Record<string, { label: string; style: string }> = {
  feature: { label: 'Nieuw', style: 'bg-lx-icon-bg text-lx-cta' },
  promo:   { label: 'Actie', style: 'bg-amber-50 text-amber-700' },
  info:    { label: 'Info',  style: 'bg-blue-50 text-blue-700' },
}

export default async function AdminMeldingenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/dashboard')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, title, body, type, published_at')
    .order('published_at', { ascending: false })

  return (
    <div className="p-4 sm:p-6 lg:p-7 w-full max-w-3xl">
      <h1 className="text-[20px] font-bold text-lx-text-primary mb-1">Meldingen</h1>
      <p className="text-[13px] text-lx-text-secondary mb-7">
        Berichten die verschijnen in de notificatiebel van alle gebruikers.
      </p>

      <CreateNotificationForm />

      {/* Bestaande meldingen */}
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
    </div>
  )
}
