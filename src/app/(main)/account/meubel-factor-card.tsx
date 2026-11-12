'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { updateMeubelFactor } from '@/lib/actions/account'

export default function MeubelFactorCard({ factor }: { factor: number }) {
  const opgemaakt = (n: number) => n.toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const [waarde, setWaarde] = useState(opgemaakt(factor))
  const [melding, setMelding] = useState<{ ok: boolean; tekst: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMelding(null)
    startTransition(async () => {
      const result = await updateMeubelFactor(waarde)
      if (result.success && result.factor) {
        setWaarde(opgemaakt(result.factor))
        setMelding({ ok: true, tekst: 'Factor opgeslagen.' })
      } else {
        setMelding({ ok: false, tekst: result.error ?? 'Opslaan mislukt.' })
      }
    })
  }

  return (
    <div className="bg-white rounded-[18px] border border-black/6 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-lx-divider">
        <h2 className="text-[14px] font-bold text-lx-text-primary">Tailor-Made meubels</h2>
        <p className="text-[12px] text-lx-text-secondary mt-0.5">
          De prijs in beeld en op de offerte is de inkoopprijs maal deze factor. Geldt voor het hele bedrijf. Eén cijfer achter de komma, bijvoorbeeld 2,0 of 2,5.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="px-6 py-5">
        <label htmlFor="meubel-factor" className="block text-[12px] font-semibold text-lx-text-secondary mb-1.5">Factor meubels</label>
        <div className="flex items-center gap-2">
          <input
            id="meubel-factor"
            inputMode="decimal"
            value={waarde}
            onChange={(e) => setWaarde(e.target.value.replace(/[^\d.,]/g, '').slice(0, 4))}
            className="w-20 h-10 rounded-xl border border-black/10 text-center text-[14px] font-semibold text-lx-text-primary outline-none focus:border-lx-cta bg-white px-2"
          />
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 h-10 px-4 rounded-xl bg-lx-cta hover:bg-lx-cta-hover text-white text-[13px] font-semibold transition-colors disabled:opacity-60 cursor-pointer"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Opslaan
          </button>
        </div>
        {melding && (
          <p role="status" className={`text-[12px] mt-2 ${melding.ok ? 'text-lx-text-secondary' : 'text-red-600'}`}>{melding.tekst}</p>
        )}
      </form>
    </div>
  )
}
