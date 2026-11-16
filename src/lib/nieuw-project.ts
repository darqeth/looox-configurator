'use client'

import { useEffect, useState } from 'react'

// "Nieuw project" op de projectenpagina: de naam gaat mee naar de configurator, en het
// eerste product dat daar wordt opgeslagen wordt de eerste regel van het project.
// Een project bestaat pas zodra er een regel is, dus er komen geen lege projecten.
const SLEUTEL = 'lx-nieuw-project'
const GELDIG_MS = 2 * 60 * 60 * 1000

export function startNieuwProject(naam: string) {
  try { window.sessionStorage.setItem(SLEUTEL, JSON.stringify({ naam, sinds: Date.now() })) } catch { /* privévenster: dan zonder naam vooraf */ }
}

export function nieuwProjectKlaar() {
  try { window.sessionStorage.removeItem(SLEUTEL) } catch { /* niets te wissen */ }
}

function lees(): string | null {
  try {
    const ruw = window.sessionStorage.getItem(SLEUTEL)
    if (!ruw) return null
    const { naam, sinds } = JSON.parse(ruw) as { naam?: unknown; sinds?: unknown }
    if (typeof naam !== 'string' || typeof sinds !== 'number' || Date.now() - sinds > GELDIG_MS) return null
    return naam
  } catch { return null }
}

/** Is de gebruiker net een nieuw project begonnen? Dan wordt het eerste product meteen een project. */
export function nieuwProjectActief(): boolean {
  return lees() !== null
}

/** Naam van het project dat de gebruiker net is begonnen, of null. `actief` uit: nooit (bewerken, bestaand project). */
export function useNieuwProject(actief: boolean, onNaam: (naam: string) => void): string | null {
  const [naam, setNaam] = useState<string | null>(null)
  useEffect(() => {
    if (!actief) return
    const n = lees()
    if (n === null) return
    setNaam(n)
    onNaam(n)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actief])
  return naam
}
