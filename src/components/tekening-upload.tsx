'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { Loader2, PencilRuler } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { setMeubelTekening, setMeubelGaten } from '@/lib/actions/meubel'
import type { TekenInvoer } from '@/lib/meubel-opslag'
import type { Gat } from '@/lib/meubel-gaten'
import { toast } from '@/components/toast'
import { comprimeerAfbeelding } from '@/lib/comprimeer-afbeelding'
import { foutTekst } from '@/lib/fout-tekst'

const MAX_MB = 10

// Het tekenvenster is groot en zelden nodig: pas laden als iemand het opent
const GatenEditor = dynamic(() => import('@/app/(main)/configurator/meubel/gaten-editor'), { ssr: false })

// Tekening toevoegen aan een opgeslagen meubel, direct vanuit een lijst of de bestelstap:
// een eigen maattekening uploaden, of de gaten zelf tekenen als dat bij het meubel kan.
// Zo hoeft niemand de configuratie te openen alleen voor de tekening.
export default function TekeningUpload({ configId, onKlaar, groot = false, tekenen = null }: {
  configId: string
  onKlaar?: () => void
  /** Invoer voor het tekenvenster; null als er bij dit meubel alleen geüpload kan worden */
  tekenen?: TekenInvoer | null
  /** Volle knop met tekst (bestelstap) in plaats van het compacte label in een lijst */
  groot?: boolean
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [bezig, setBezig] = useState(false)
  const [venster, setVenster] = useState(false)
  const [opslaan, setOpslaan] = useState(false)
  // Koos de dealer voor zelf tekenen, dan hoort er geen upload bij
  const alleenTekenen = !!tekenen?.zelf

  async function bewaarGaten(gaten: Gat[]) {
    setOpslaan(true)
    try {
      const res = await setMeubelGaten(configId, gaten)
      if (res.error) { toast(res.error); return }
      setVenster(false)
      onKlaar?.()
      queryClient.invalidateQueries({ queryKey: ['configurations'] })
      router.refresh()
      toast('Tekening opgeslagen. De prijs is bijgewerkt.', 'success')
    } catch (e) {
      console.error('[tekening] gaten', e)
      toast(foutTekst(e, 'Opslaan van de tekening is mislukt. Probeer het opnieuw.'))
    } finally {
      setOpslaan(false)
    }
  }

  async function kies(origineel: File | undefined) {
    if (!origineel) return
    const bestand = await comprimeerAfbeelding(origineel)
    if (bestand.size > MAX_MB * 1024 * 1024) {
      toast(`Het bestand is te groot. Maximaal ${MAX_MB} MB.`)
      return
    }
    setBezig(true)
    try {
      const supabase = createClient()
      const ext = bestand.name.split('.').pop() ?? 'bin'
      const pad = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('attachments').upload(pad, bestand, { upsert: false })
      if (error) throw new Error('Uploaden van de maattekening is mislukt. Probeer het opnieuw.')
      const url = supabase.storage.from('attachments').getPublicUrl(pad).data.publicUrl
      const res = await setMeubelTekening(configId, url)
      if (res.error) throw new Error(res.error)
      onKlaar?.()
      queryClient.invalidateQueries({ queryKey: ['configurations'] })
      router.refresh()
      toast('Maattekening toegevoegd.', 'success')
    } catch (e) {
      console.error('[upload] maattekening', e)
      toast(foutTekst(e, 'Uploaden mislukt. Probeer het opnieuw.'))
    } finally {
      setBezig(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const knop = groot
    ? 'w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[13px] font-semibold transition-colors disabled:opacity-60 cursor-pointer'
    : 'flex items-center gap-1.5 px-2.5 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[12px] font-semibold hover:bg-amber-100 transition-colors whitespace-nowrap disabled:opacity-60 cursor-pointer'
  const tweede = groot
    ? 'w-full h-10 flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white hover:bg-amber-50 text-amber-800 text-[13px] font-semibold transition-colors disabled:opacity-60 cursor-pointer'
    : knop

  return (
    <div className={groot ? 'space-y-2' : 'flex items-center gap-1.5'}>
      {tekenen && (
        <button type="button" onClick={() => setVenster(true)} disabled={bezig || opslaan} title="Teken de gaten en de waskom zelf op het blad" className={knop}>
          <PencilRuler className="w-3.5 h-3.5" aria-hidden="true" />
          {tekenen.context.soort === 'solid' ? 'Waskom plaatsen' : 'Zelf tekenen'}
        </button>
      )}
      {!alleenTekenen && <>
        <input ref={inputRef} type="file" accept="image/*,.pdf" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => kies(e.target.files?.[0])} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={bezig || opslaan}
          title="Een maattekening is verplicht om te bestellen"
          className={tekenen ? tweede : knop}
        >
          {bezig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4M12 17h.01" />
            </svg>
          )}
          {bezig ? 'Uploaden…' : groot ? 'Maattekening uploaden' : tekenen ? 'Uploaden' : 'Tekening toevoegen'}
        </button>
      </>}
      {venster && tekenen && (
        <GatenEditor context={tekenen.context} gaten={tekenen.gaten} titel={tekenen.titel} bezig={opslaan} onKlaar={bewaarGaten} onSluiten={() => setVenster(false)} />
      )}
    </div>
  )
}
