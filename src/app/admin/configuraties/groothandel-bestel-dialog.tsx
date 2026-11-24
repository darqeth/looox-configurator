'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { zetOpBesteldViaGroothandel } from '@/lib/actions/admin-orders'
import { groothandelWaarschuwingen } from '@/lib/groothandel-order'
import { foutTekst } from '@/lib/fout-tekst'
import { toast } from '@/components/toast'
import type { ConfigRow } from './config-detail-modal'

// Bevestiging voor het handmatig op besteld zetten. De order is daarna een gewone
// order op naam van de dealer en is niet eenvoudig terug te draaien.

const veld = 'w-full px-3 py-2 rounded-xl border border-black/10 bg-white text-[13px] text-lx-text-primary placeholder:text-lx-placeholder focus:outline-none focus:ring-2 focus:ring-lx-cta/20 focus:border-lx-cta transition-colors'

export default function GroothandelBestelDialog({ config, projectOpen, onCancel, onKlaar }: {
  config: ConfigRow
  /** Aantal nog niet bestelde regels van het project; 0 bij een losse configuratie */
  projectOpen: number
  onCancel: () => void
  onKlaar: () => void
}) {
  const router = useRouter()
  const [referentie, setReferentie] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const dealer = config.profiles?.company ?? config.profiles?.full_name ?? config.profiles?.email ?? 'de dealer'
  const waarschuwingen = groothandelWaarschuwingen(config.selected_options)
  const isProject = !!config.project_id

  function bevestig() {
    setError('')
    startTransition(async () => {
      try {
        const result = await zetOpBesteldViaGroothandel(config.id, { referentie, notes })
        if (!result.success) { setError(result.error); return }
        toast(result.aantalRegels > 1
          ? `${result.orderNumber} aangemaakt voor ${dealer}, ${result.aantalRegels} regels.`
          : `${result.orderNumber} aangemaakt voor ${dealer}.`, 'success')
        router.refresh()
        onKlaar()
      } catch (e) {
        setError(foutTekst(e, 'Op besteld zetten is mislukt. Probeer het opnieuw.'))
      }
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div role="dialog" aria-modal="true" aria-label="Op besteld zetten via groothandel" className="bg-white rounded-2xl border border-black/8 shadow-xl w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <div className="px-5 pt-5 pb-4 border-b border-lx-divider">
          <h2 className="text-[15px] font-bold text-lx-text-primary">Op besteld zetten (via groothandel)</h2>
          <p className="text-[12px] text-lx-text-muted mt-0.5">{config.name ?? 'Naamloze configuratie'} · {dealer}</p>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-[13px] text-lx-text-secondary leading-relaxed">
            Er wordt een bestelling aangemaakt op naam van {dealer}, met de prijs en het aantal van de offerte. De dealer ziet hem onder Bestellingen. Er gaat geen orderbevestiging per mail uit. Daarna kun je de status wijzigen en tekeningen ter goedkeuring aanbieden.
          </p>

          {isProject && (
            <p className="text-[12.5px] text-lx-text-primary bg-lx-panel-bg border border-lx-divider rounded-lg px-3 py-2">
              Deze configuratie hoort bij een project. {projectOpen > 1 ? `Alle ${projectOpen} nog niet bestelde regels van het project worden samen besteld onder één ordernummer.` : 'De nog niet bestelde regels van het project worden samen besteld onder één ordernummer.'}
            </p>
          )}

          {waarschuwingen.length > 0 && (
            <div className="text-[12.5px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <p className="font-semibold mb-0.5">Let op</p>
              {waarschuwingen.map((w) => <p key={w}>{w}</p>)}
            </div>
          )}

          <label className="block">
            <span className="block text-[12px] font-semibold text-lx-text-primary mb-1">Referentie groothandel <span className="font-normal text-lx-text-muted">(optioneel)</span></span>
            <input type="text" value={referentie} onChange={(e) => setReferentie(e.target.value)} maxLength={200} disabled={isPending} placeholder="Bijvoorbeeld het inkoopnummer" className={veld} />
          </label>

          <label className="block">
            <span className="block text-[12px] font-semibold text-lx-text-primary mb-1">Opmerking bij de bestelling <span className="font-normal text-lx-text-muted">(optioneel)</span></span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={5000} rows={3} disabled={isPending} className={`${veld} resize-none`} />
            <span className="block text-[11px] text-lx-text-muted mt-1">Komt op de orderbevestiging en is zichtbaar voor de dealer.</span>
          </label>

          <p className="text-[12px] text-lx-text-muted">Dit is niet eenvoudig terug te draaien.</p>

          {error && (
            <p className="text-[12.5px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="flex gap-2.5 px-5 pb-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 rounded-xl border border-black/10 text-[13px] font-semibold text-lx-text-primary hover:bg-lx-panel-bg transition-colors disabled:opacity-60 cursor-pointer"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={bevestig}
            disabled={isPending}
            className="flex-1 px-4 py-2.5 rounded-xl bg-lx-cta text-white text-[13px] font-semibold hover:bg-lx-cta-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPending ? 'Bezig…' : 'Op besteld zetten'}
          </button>
        </div>
      </div>
    </div>
  )
}
