'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Copy, Loader2, Pencil, Trash2 } from 'lucide-react'
import { kopieerRegel } from '@/lib/actions/project'
import { deleteConfiguration } from '@/lib/actions/configurator'
import { toast } from '@/components/toast'
import { foutTekst } from '@/lib/fout-tekst'

// Bewerken en verwijderen van één regel in een project.
export default function RegelActies({ configId, titel, laatste, kopieerbaar = false }: { configId: string; titel: string; laatste: boolean; /** Kopiëren kan zolang er niets van het project besteld is */ kopieerbaar?: boolean }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [bevestig, setBevestig] = useState(false)
  const [isPending, startTransition] = useTransition()

  function verwijder() {
    startTransition(async () => {
      try {
        await deleteConfiguration(configId)
        queryClient.invalidateQueries({ queryKey: ['configurations'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        queryClient.invalidateQueries({ queryKey: ['sidebar'] })
        // Was dit de laatste regel, dan bestaat het project niet meer
        if (laatste) router.push('/projecten')
        else router.refresh()
      } catch (e) {
        console.error(e)
        toast(foutTekst(e, 'Verwijderen mislukt. Probeer het opnieuw.'))
        setBevestig(false)
      }
    })
  }

  function kopieer() {
    startTransition(async () => {
      try {
        await kopieerRegel(configId)
        queryClient.invalidateQueries({ queryKey: ['sidebar'] })
        router.refresh()
        toast('Regel gekopieerd. Pas de kopie aan met het potloodje.')
      } catch (e) {
        console.error(e)
        toast(foutTekst(e, 'Kopiëren mislukt. Probeer het opnieuw.'))
      }
    })
  }

  if (bevestig) {
    return (
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={verwijder}
          disabled={isPending}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[12px] font-semibold transition-colors disabled:opacity-60 cursor-pointer"
        >
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Verwijderen
        </button>
        <button
          onClick={() => setBevestig(false)}
          disabled={isPending}
          className="h-8 px-3 rounded-lg border border-black/10 text-lx-text-secondary text-[12px] font-semibold hover:bg-lx-panel-bg transition-colors cursor-pointer"
        >
          Annuleren
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      <Link
        href={`/configurator/${configId}`}
        aria-label={`${titel} bewerken`}
        title="Bewerken"
        className="w-8 h-8 rounded-lg hover:bg-lx-panel-bg flex items-center justify-center text-lx-text-secondary hover:text-lx-text-primary transition-colors"
      >
        <Pencil size={14} />
      </Link>
      {kopieerbaar && (
        <button
          onClick={kopieer}
          disabled={isPending}
          aria-label={`${titel} kopiëren`}
          title="Kopiëren"
          className="w-8 h-8 rounded-lg hover:bg-lx-panel-bg flex items-center justify-center text-lx-text-secondary hover:text-lx-text-primary transition-colors cursor-pointer disabled:opacity-50"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
        </button>
      )}
      <button
        onClick={() => setBevestig(true)}
        aria-label={`${titel} verwijderen`}
        title="Verwijderen"
        className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-lx-text-secondary hover:text-red-600 transition-colors cursor-pointer"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
