// Bedrijfsnamen vergelijken, zodat "RM Sanitair", "rm sanitair " en "RM Sanitair B.V."
// als hetzelfde bedrijf gelden. Vestigingen ("Baderie Eindhoven" en "Baderie Arnhem")
// blijven aparte bedrijven: alleen schrijfwijze en rechtsvorm vallen weg.

const RECHTSVORM = /(^|\s)(b\.?\s?v\.?|v\.?\s?o\.?\s?f\.?|n\.?\s?v\.?)(?=\s|$)/g

/** Naam zonder hoofdletters, accenten, leestekens, spaties en rechtsvorm. */
export function normaliseerBedrijf(naam: string): string {
  return naam
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' en ')
    .replace(RECHTSVORM, ' ')
    .replace(/[^a-z0-9]/g, '')
}

function afstand(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let vorige = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const rij = [i]
    for (let j = 1; j <= b.length; j++) {
      rij[j] = Math.min(vorige[j] + 1, rij[j - 1] + 1, vorige[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    vorige = rij
  }
  return vorige[b.length]
}

/** Bijna dezelfde naam: een tikfout of één letter verschil, niet een andere plaatsnaam. */
export function lijktOpBedrijf(a: string, b: string): boolean {
  const x = normaliseerBedrijf(a)
  const y = normaliseerBedrijf(b)
  if (!x || !y || x === y) return false
  const max = Math.min(x.length, y.length) >= 10 ? 2 : Math.min(x.length, y.length) >= 5 ? 1 : 0
  return max > 0 && afstand(x, y, max) <= max
}

export type BedrijfMatch =
  /** Letterlijk dezelfde naam */
  | { soort: 'zelfde'; naam: string }
  /** Zelfde bedrijf, anders geschreven */
  | { soort: 'gelijk'; naam: string }
  /** Lijkt erop: kan een tikfout zijn, kan een ander bedrijf zijn */
  | { soort: 'lijkt'; naam: string }
  | { soort: 'nieuw' }

/** Vergelijkt een ingetypte naam met de bestaande bedrijfsnamen. */
export function vergelijkBedrijf(invoer: string, bestaand: string[]): BedrijfMatch {
  const schoon = invoer.trim()
  const norm = normaliseerBedrijf(schoon)
  if (!norm) return { soort: 'nieuw' }
  const zelfde = bestaand.find((n) => n.trim() === schoon)
  if (zelfde) return { soort: 'zelfde', naam: zelfde.trim() }
  const gelijk = bestaand.find((n) => normaliseerBedrijf(n) === norm)
  if (gelijk) return { soort: 'gelijk', naam: gelijk.trim() }
  const lijkt = bestaand.find((n) => lijktOpBedrijf(n, schoon))
  if (lijkt) return { soort: 'lijkt', naam: lijkt.trim() }
  return { soort: 'nieuw' }
}

/** Snelselectie tijdens typen: namen die met de invoer beginnen, of waarvan een woord ermee begint. */
export function suggereerBedrijven(invoer: string, bestaand: string[], max = 8): string[] {
  const norm = normaliseerBedrijf(invoer)
  if (norm.length < 3) return []
  const gezien = new Set<string>()
  const begin: string[] = []
  const woord: string[] = []
  for (const naam of bestaand) {
    const n = normaliseerBedrijf(naam)
    if (!n || gezien.has(n)) continue
    if (n.startsWith(norm)) { begin.push(naam.trim()); gezien.add(n) }
    else if (naam.split(/\s+/).some((w) => normaliseerBedrijf(w).startsWith(norm))) { woord.push(naam.trim()); gezien.add(n) }
  }
  const opNaam = (a: string, b: string) => a.localeCompare(b, 'nl')
  return [...begin.sort(opNaam), ...woord.sort(opNaam)].slice(0, max)
}
