import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/company-utils'
import { redirect } from 'next/navigation'
import CreateDownloadForm from './create-form'
import EditDownloadRow from './edit-download-row'

export default async function AdminDownloadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!await isAdmin(supabase, user.id)) redirect('/dashboard')

  const { data: downloads } = await supabase
    .from('downloads')
    .select('id, title, file_url, file_ext, file_size, sort_order, is_active, created_at')
    .order('sort_order')

  return (
    <div className="p-4 sm:p-6 lg:p-7 w-full max-w-3xl">
      <h1 className="text-[20px] font-bold text-lx-text-primary mb-1">Downloads</h1>
      <p className="text-[13px] text-lx-text-secondary mb-7">
        Bestanden die zichtbaar zijn op het dashboard van alle gebruikers.
      </p>

      <CreateDownloadForm />

      {/* Bestaande downloads */}
      <div className="mt-8">
        <p className="text-[12px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-3">
          Gepubliceerde bestanden ({downloads?.length ?? 0})
        </p>

        {downloads && downloads.length > 0 ? (
          <div className="space-y-2">
            {downloads.map((dl, idx) => (
              <EditDownloadRow
                key={dl.id}
                dl={dl}
                isFirst={idx === 0}
                isLast={idx === downloads.length - 1}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-black/8 px-5 py-10 text-center">
            <p className="text-[13px] text-lx-text-secondary">Nog geen bestanden toegevoegd.</p>
          </div>
        )}
      </div>
    </div>
  )
}
