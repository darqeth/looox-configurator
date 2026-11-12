'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { setMeubelTekening } from '@/lib/actions/meubel'
import { toast } from '@/components/toast'

const MAX_MB = 10

// Maattekening toevoegen aan een opgeslagen meubel, direct vanuit een lijst of
// de bestelstap. Zo hoeft niemand de configuratie te openen alleen voor de tekening.
export default function TekeningUpload({ configId, onKlaar, groot = false }: {
  configId: string
  onKlaar?: (url: string) => void
  /** Volle knop met tekst (bestelstap) in plaats van het compacte label in een lijst */
  groot?: boolean
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [bezig, setBezig] = useState(false)

  async function kies(bestand: File | undefined) {
    if (!bestand) return
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
      await setMeubelTekening(configId, url)
      onKlaar?.(url)
      queryClient.invalidateQueries({ queryKey: ['configurations'] })
      router.refresh()
      toast('Maattekening toegevoegd.')
    } catch (e) {
      console.error('[upload] maattekening', e)
      toast(e instanceof Error ? e.message : 'Uploaden mislukt. Probeer het opnieuw.')
    } finally {
      setBezig(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*,.pdf" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => kies(e.target.files?.[0])} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={bezig}
        title="Een maattekening is verplicht om te bestellen"
        className={groot
          ? 'w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[13px] font-semibold transition-colors disabled:opacity-60 cursor-pointer'
          : 'flex items-center gap-1.5 px-2.5 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[12px] font-semibold hover:bg-amber-100 transition-colors whitespace-nowrap disabled:opacity-60 cursor-pointer'}
      >
        {bezig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4M12 17h.01" />
          </svg>
        )}
        {bezig ? 'Uploaden…' : groot ? 'Maattekening uploaden' : 'Tekening toevoegen'}
      </button>
    </>
  )
}
