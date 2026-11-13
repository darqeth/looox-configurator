import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import type { MeubelModel } from '@/lib/meubel-config'

// Bijverkoop bij een meubel, vóór het bestellen: een waskom en een spiegel erbij als
// regel in hetzelfde project, zodat alles in één bestelling meegaat.
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

export type UpsellSoort = 'waskom' | 'spiegel'

/** Waar de dealer het product samenstelt, als regel van dit project. */
export function upsellHref(soort: UpsellSoort, projectId: string): string {
  return soort === 'waskom' ? `/configurator/meubel?project=${projectId}&categorie=waskommen` : `/configurator/nieuw?project=${projectId}`
}

/**
 * Met projectId zijn het links naar de configurator. Zonder project (in de samenvatting,
 * het meubel is nog niet opgeslagen) meldt onKies de keuze en slaat de aanroeper eerst op.
 */
export default function UpsellCards({ waskom, spiegel, projectId, onKies, disabled }: UpsellKeuze & { projectId?: string; onKies?: (soort: UpsellSoort) => void; disabled?: boolean }) {
  if (!waskom && !spiegel) return null
  const Kaart = ({ soort, children }: { soort: UpsellSoort; children: React.ReactNode }) =>
    projectId
      ? <Link href={upsellHref(soort, projectId)} className={kaartCls}>{children}</Link>
      : <button type="button" disabled={disabled} onClick={() => onKies?.(soort)} className={`${kaartCls} w-full cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed`}>{children}</button>
  return (
    <div className="space-y-2 pt-1">
      {waskom && (
        <Kaart soort="waskom">
          <span className="relative w-16 h-12 flex-shrink-0">
            <Image src="/images/meubels/artikel-WTMWK40MW.webp" alt="" fill sizes="64px" className="object-contain" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-lx-text-primary">Ook nog een waskom nodig?</span>
            <span className="block text-[11.5px] text-lx-text-secondary">Keramiek, terrazzo of Solid Surface, passend bij je meubel.</span>
          </span>
          <ArrowRight size={16} className="text-lx-cta flex-shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Kaart>
      )}
      {spiegel && (
        <Kaart soort="spiegel">
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
        </Kaart>
      )}
    </div>
  )
}
