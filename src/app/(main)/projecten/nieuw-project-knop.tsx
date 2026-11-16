'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { startNieuwProject } from '@/lib/nieuw-project'

// Begint een project met een naam; daarna kies je het eerste product.
export default function NieuwProjectKnop({ primair = false }: { primair?: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [naam, setNaam] = useState('')

  function begin(e: React.FormEvent) {
    e.preventDefault()
    if (!naam.trim()) return
    startNieuwProject(naam.trim().slice(0, 200))
    router.push('/configurator/nieuw')
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 text-[13px] font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer ${primair ? 'bg-lx-cta hover:bg-lx-cta-hover text-white' : 'bg-white border border-black/10 text-lx-text-primary hover:bg-lx-panel-bg'}`}
      >
        <Plus size={15} aria-hidden="true" />
        Nieuw project
      </button>
    )
  }

  return (
    <form onSubmit={begin} className="flex flex-wrap items-center gap-2 justify-center">
      <label htmlFor="nieuw-project-naam" className="sr-only">Naam van het project</label>
      <input
        id="nieuw-project-naam"
        autoFocus
        value={naam}
        onChange={(e) => setNaam(e.target.value)}
        maxLength={200}
        placeholder="Naam, bijvoorbeeld de klant"
        className="h-10 w-56 rounded-xl border border-black/12 px-3.5 text-[13px] text-lx-text-primary outline-none focus:border-lx-cta bg-white"
      />
      <button type="submit" disabled={!naam.trim()} className="h-10 px-4 rounded-xl bg-lx-cta hover:bg-lx-cta-hover text-white text-[13px] font-semibold transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">
        Eerste product kiezen
      </button>
      <button type="button" onClick={() => setOpen(false)} className="h-10 px-3 rounded-xl text-[13px] font-semibold text-lx-text-secondary hover:text-lx-text-primary cursor-pointer">
        Annuleren
      </button>
    </form>
  )
}
