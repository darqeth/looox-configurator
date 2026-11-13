import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import type { MeubelModel } from '@/lib/meubel-config'

// Bijverkoop na een bestelling met een meubel: een waskom en een spiegel erbij.
// Alleen wat nog ontbreekt wordt getoond; zonder kaarten rendert er niets.

export interface UpsellKeuze {
  waskom: boolean
  spiegel: boolean
}

/** Wat past er nog bij deze meubels? Een waskom alleen als er nog geen in of bij zit. */
export function upsellVoorMeubels(modellen: MeubelModel[], heeftSpiegel = false): UpsellKeuze {
  const heeftWaskom = modellen.some((m) => m.waskom || m.categorie === 'waskommen')
  const waskomPast = modellen.some((m) => m.categorie === 'wastafelmeubels' || m.categorie === 'toiletmeubels' || m.categorie === 'planken')
  return { waskom: waskomPast && !heeftWaskom, spiegel: modellen.length > 0 && !heeftSpiegel }
}

const kaartCls = 'group flex items-center gap-3 rounded-xl border border-black/8 bg-lx-panel-bg p-3 text-left hover:border-lx-cta transition-colors'

export default function UpsellCards({ waskom, spiegel }: UpsellKeuze) {
  if (!waskom && !spiegel) return null
  return (
    <div className="space-y-2 pt-1">
      {waskom && (
        <Link href="/configurator/meubel?categorie=waskommen" className={kaartCls}>
          <span className="relative w-16 h-12 flex-shrink-0">
            <Image src="/images/meubels/artikel-WTMWK40MW.webp" alt="" fill sizes="64px" className="object-contain" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-lx-text-primary">Ook nog een waskom nodig?</span>
            <span className="block text-[11.5px] text-lx-text-secondary">Keramiek, terrazzo of Solid Surface, passend bij je meubel.</span>
          </span>
          <ArrowRight size={16} className="text-lx-cta flex-shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      )}
      {spiegel && (
        <Link href="/configurator/nieuw" className={kaartCls}>
          <span className="w-16 h-12 flex-shrink-0 flex items-center justify-center">
            <svg width="34" height="44" viewBox="0 0 34 44" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="32" height="42" rx="16" fill="#DDE5E8" stroke="var(--lx-text-primary)" strokeWidth="1.5" />
              <path d="M19 6 L25 6 L15 38 L9 38 Z" fill="#fff" fillOpacity="0.6" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-lx-text-primary">Ook een spiegel erbij?</span>
            <span className="block text-[11.5px] text-lx-text-secondary">Stel een spiegel op maat samen, met of zonder verlichting.</span>
          </span>
          <ArrowRight size={16} className="text-lx-cta flex-shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}
