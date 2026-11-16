'use client'

import { useSyncExternalStore } from 'react'
import { Eye, EyeOff } from 'lucide-react'

// De inkoopprijs staat standaard uit: een klant kijkt vaak mee op het scherm.
// De keuze geldt voor dit apparaat en voor alle schermen tegelijk.
const SLEUTEL = 'lx-toon-inkoop'
const GEBEURTENIS = 'lx-toon-inkoop'

function lees(): boolean {
  try { return window.localStorage.getItem(SLEUTEL) === '1' } catch { return false }
}

function volg(opWijziging: () => void) {
  window.addEventListener(GEBEURTENIS, opWijziging)
  window.addEventListener('storage', opWijziging)
  return () => {
    window.removeEventListener(GEBEURTENIS, opWijziging)
    window.removeEventListener('storage', opWijziging)
  }
}

/** Of de inkoopprijs nu getoond wordt, en een functie om dat te wisselen. */
export function useToonInkoop(): [boolean, (aan: boolean) => void] {
  const aan = useSyncExternalStore(volg, lees, () => false)
  const zet = (waarde: boolean) => {
    try { window.localStorage.setItem(SLEUTEL, waarde ? '1' : '0') } catch { /* privévenster: alleen deze sessie */ }
    window.dispatchEvent(new Event(GEBEURTENIS))
  }
  return [aan, zet]
}

/** Knop met oogje: toont of verbergt de eigen inkoopprijs. */
export default function InkoopOog({ className = '' }: { className?: string }) {
  const [aan, zet] = useToonInkoop()
  return (
    <button
      type="button"
      onClick={() => zet(!aan)}
      aria-pressed={aan}
      className={`inline-flex items-center gap-1.5 text-[12px] font-semibold text-lx-text-secondary hover:text-lx-text-primary transition-colors cursor-pointer ${className}`}
    >
      {aan ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
      {aan ? 'Verberg mijn inkoop' : 'Toon mijn inkoop'}
    </button>
  )
}

/**
 * Onder een prijsblok: uitleg bij bruto, het oogje, en de eigen inkoopprijs als het oogje aan staat.
 * `mag` is het recht van de gebruiker; zonder dat recht staat er alleen de uitleg.
 */
export function MijnInkoop({ nettoCents, mag, toelichting }: { nettoCents: number | null; mag: boolean; toelichting?: string }) {
  const [aan] = useToonInkoop()
  return (
    <div className="border-t border-lx-divider pt-3 space-y-1.5">
      <p className="text-[11px] text-lx-text-secondary leading-snug">Bruto is de adviesprijs voor je klant.{mag ? ' Netto is wat je zelf betaalt.' : ''}</p>
      {mag && (
        <>
          {aan && nettoCents !== null && (
            <div className="flex justify-between gap-2 text-[13px] font-bold">
              <span className="text-lx-text-primary">Mijn inkoop, netto</span>
              <span className="text-lx-text-primary tabular-nums">{(nettoCents / 100).toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' })}</span>
            </div>
          )}
          {aan && nettoCents !== null && toelichting && <p className="text-[11px] text-lx-text-secondary leading-snug">{toelichting}</p>}
          <InkoopOog />
        </>
      )}
    </div>
  )
}
