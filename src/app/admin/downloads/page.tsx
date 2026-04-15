import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/company-utils'
import { redirect } from 'next/navigation'
import CreateDownloadForm from './create-form'
import { DeleteDownloadButton, MoveDownloadButtons } from './download-actions'

const EXT_COLORS: Record<string, { bg: string; text: string }> = {
  PDF:  { bg: 'bg-red-50',    text: 'text-red-600' },
  ZIP:  { bg: 'bg-blue-50',   text: 'text-blue-600' },
  DOCX: { bg: 'bg-sky-50',    text: 'text-sky-600' },
  XLSX: { bg: 'bg-green-50',  text: 'text-green-700' },
  DWG:  { bg: 'bg-orange-50', text: 'text-orange-600' },
  AI:   { bg: 'bg-amber-50',  text: 'text-amber-700' },
  EPS:  { bg: 'bg-purple-50', text: 'text-purple-600' },
}

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
            {downloads.map((dl, idx) => {
              const extStyle = EXT_COLORS[dl.file_ext] ?? { bg: 'bg-lx-panel-bg', text: 'text-lx-text-secondary' }
              return (
                <div key={dl.id} className="bg-white rounded-xl border border-black/8 px-4 py-3 flex items-center gap-3">
                  {/* Volgorde knoppen */}
                  <MoveDownloadButtons
                    id={dl.id}
                    isFirst={idx === 0}
                    isLast={idx === (downloads.length - 1)}
                  />

                  {/* Type badge */}
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${extStyle.bg} ${extStyle.text}`}>
                    {dl.file_ext}
                  </span>

                  {/* Naam + URL */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-lx-text-primary truncate">{dl.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <a
                        href={dl.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-lx-cta hover:underline truncate max-w-xs"
                      >
                        {dl.file_url}
                      </a>
                      {dl.file_size && (
                        <span className="text-[11px] text-lx-text-muted flex-shrink-0">· {dl.file_size}</span>
                      )}
                    </div>
                  </div>

                  <DeleteDownloadButton id={dl.id} />
                </div>
              )
            })}
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
