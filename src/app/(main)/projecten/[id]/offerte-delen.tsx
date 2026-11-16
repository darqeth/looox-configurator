'use client'

import { useState, useSyncExternalStore } from 'react'
import { Loader2, Share2 } from 'lucide-react'
import { toast } from '@/components/toast'

// Offerte delen via het deelmenu van het toestel (mail, WhatsApp, AirDrop). Alleen
// zichtbaar waar de browser bestanden kan delen; elders is er de downloadknop.
const kanDelen = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function' && typeof navigator.canShare === 'function'
  && navigator.canShare({ files: [new File([''], 'offerte.pdf', { type: 'application/pdf' })] })

export default function OfferteDelen({ url, bestandsnaam }: { url: string; bestandsnaam: string }) {
  const zichtbaar = useSyncExternalStore(() => () => {}, kanDelen, () => false)
  const [bezig, setBezig] = useState(false)
  if (!zichtbaar) return null

  async function deel() {
    setBezig(true)
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error('offerte ophalen mislukt')
      const bestand = new File([await res.blob()], bestandsnaam.replace(/[\\/:*?"<>|]/g, '-'), { type: 'application/pdf' })
      await navigator.share({ files: [bestand], title: bestandsnaam.replace(/\.pdf$/, '') })
    } catch (e) {
      // Zelf het deelmenu gesloten: geen melding
      if (!(e instanceof DOMException && e.name === 'AbortError')) toast('Delen lukte niet. Download de offerte en verstuur hem zelf.')
    } finally {
      setBezig(false)
    }
  }

  return (
    <button
      onClick={deel}
      disabled={bezig}
      className="inline-flex items-center gap-1.5 border border-black/10 bg-white hover:bg-lx-panel-bg text-lx-text-primary text-[13px] font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
    >
      {bezig ? <Loader2 size={15} className="animate-spin" /> : <Share2 size={15} />} Delen
    </button>
  )
}
