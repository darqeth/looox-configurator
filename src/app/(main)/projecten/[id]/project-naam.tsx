'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { hernoemProject } from '@/lib/actions/project'
import { toast } from '@/components/toast'

// Naam en referentie van het project, met inline wijzigen zolang het niet besteld is.
export default function ProjectNaam({ projectId, naam, referentie, bewerkbaar }: {
  projectId: string
  naam: string
  referentie: string
  bewerkbaar: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [nieuweNaam, setNieuweNaam] = useState(naam)
  const [nieuweReferentie, setNieuweReferentie] = useState(referentie)
  const [isPending, startTransition] = useTransition()

  function opslaan(e: React.FormEvent) {
    e.preventDefault()
    if (!nieuweNaam.trim()) return
    startTransition(async () => {
      try {
        await hernoemProject(projectId, nieuweNaam, nieuweReferentie)
        setOpen(false)
        router.refresh()
      } catch (err) {
        console.error(err)
        toast(err instanceof Error ? err.message : 'Opslaan mislukt. Probeer het opnieuw.')
      }
    })
  }

  if (!open) {
    return (
      <>
        <h1 className="text-[20px] font-bold text-lx-text-primary tracking-tight break-words">{naam}</h1>
        <p className="text-[13px] text-lx-text-secondary mt-0.5">
          {referentie ? `Referentie: ${referentie}` : 'Geen referentie'}
          {bewerkbaar && (
            <>
              {' · '}
              <button onClick={() => { setNieuweNaam(naam); setNieuweReferentie(referentie); setOpen(true) }} className="font-semibold text-lx-cta hover:underline cursor-pointer">
                Wijzigen
              </button>
            </>
          )}
        </p>
      </>
    )
  }

  const veld = 'w-full h-10 rounded-xl border border-black/12 px-3.5 text-[13.5px] text-lx-text-primary outline-none focus:border-lx-cta bg-white transition-colors'
  return (
    <form onSubmit={opslaan} className="space-y-2.5 w-full max-w-md">
      <div>
        <label htmlFor="project-naam" className="block text-[12px] font-semibold text-lx-text-secondary mb-1">Projectnaam</label>
        <input id="project-naam" value={nieuweNaam} onChange={(e) => setNieuweNaam(e.target.value)} maxLength={200} autoFocus className={veld} />
      </div>
      <div>
        <label htmlFor="project-referentie" className="block text-[12px] font-semibold text-lx-text-secondary mb-1">Referentie</label>
        <input id="project-referentie" value={nieuweReferentie} onChange={(e) => setNieuweReferentie(e.target.value)} maxLength={200} className={veld} />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending || !nieuweNaam.trim()}
          className="flex items-center gap-2 h-9 px-4 rounded-xl bg-lx-cta hover:bg-lx-cta-hover text-white text-[13px] font-semibold transition-colors disabled:opacity-60 cursor-pointer"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Opslaan
        </button>
        <button type="button" onClick={() => setOpen(false)} disabled={isPending} className="h-9 px-4 rounded-xl border border-black/10 text-lx-text-secondary text-[13px] font-semibold hover:bg-lx-panel-bg transition-colors cursor-pointer">
          Annuleren
        </button>
      </div>
    </form>
  )
}
