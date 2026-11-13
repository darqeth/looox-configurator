import { formatMm, type MeubelModel } from '@/lib/meubel-config'
import { plaatsGat, type Gat, type GatenContext } from '@/lib/meubel-gaten'

// Indeling van het vooraanzicht, gedeeld door de tekening op het scherm en in de
// PDF: de vakken (lades en regaalkast) van links naar rechts, in tekeneenheden.

export type RegaalZijde = 'links' | 'rechts' | 'midden'

export interface TekenVak {
  soort: 'lade' | 'regaal'
  x0: number
  x1: number
  /** Breedte in mm, voor het maatlabel */
  breedte: number
}

export interface TekenIndeling {
  vakken: TekenVak[]
  /** Linker- en rechterkant van alle vakken samen (binnen de rand) */
  links: number
  rechts: number
  /** Boven- en onderkant van het vlak met de vakken (binnen de rand als die doorloopt) */
  boven: number
  onder: number
  /** Alle verticale scheidingen, zonder de buitenkant van het korpus */
  scheidingen: number[]
}

export function tekenIndeling(opties: {
  model: MeubelModel
  /** Breedte per lade in mm */
  breedtes: number[]
  regaal?: { breedte: number; zijde: RegaalZijde } | null
  /** Linkerbovenhoek en maat van het korpus in tekeneenheden */
  x: number
  y: number
  w: number
  h: number
  /** Tekeneenheden per mm */
  schaal: number
}): TekenIndeling {
  const { model, breedtes, regaal, x, y, w, h, schaal } = opties
  const rand = (model.rand ?? 0) * schaal
  const vakken: TekenVak[] = []
  let cx = x + rand
  const regaalVak = () => {
    if (!regaal || regaal.breedte <= 0) return
    vakken.push({ soort: 'regaal', x0: cx, x1: cx + regaal.breedte * schaal, breedte: regaal.breedte })
    cx += regaal.breedte * schaal
  }
  if (regaal?.zijde === 'links') regaalVak()
  breedtes.forEach((b, i) => {
    // In het midden: de regaalkast staat na de eerste lade (Drawer Box Regal)
    if (regaal?.zijde === 'midden' && i === 1) regaalVak()
    vakken.push({ soort: 'lade', x0: cx, x1: cx + b * schaal, breedte: b })
    cx += b * schaal
  })
  if (regaal?.zijde === 'rechts') regaalVak()

  const links = vakken[0]?.x0 ?? x
  const rechts = vakken[vakken.length - 1]?.x1 ?? x + w
  const buiten = (gx: number) => Math.abs(gx - x) < 0.5 || Math.abs(gx - (x + w)) < 0.5
  const scheidingen = [...new Set([links, ...vakken.map((v) => v.x1)].map((gx) => Math.round(gx * 100) / 100))].filter((gx) => !buiten(gx))
  return {
    vakken, links, rechts, scheidingen,
    boven: y + (model.randBoven ? rand : 0),
    onder: y + h - (model.randOnder ? rand : 0),
  }
}

// ─── Bovenaanzicht van het blad met gaten en waskommen ──────────────────────

export interface TekenGat {
  soort: Gat['soort']
  /** Volgnummer in de tekening en in de tabel, vanaf 1 */
  nr: number
  /** Plaats van het gat in de lijst die de dealer bewerkt; -1 bij een indicatieve waskom */
  index: number
  /** Hart in mm: vanaf de linkerkant en vanaf de achterkant van het blad */
  x: number
  y: number
  /** Diameter in mm; 0 bij een waskom */
  d: number
  /** Waskom: buitenmaat, hoekradius en afvoer */
  b?: number
  h?: number
  radius?: number
  ovaal?: boolean
  afvoer?: number
}

/** Alle gaten met absolute maten in mm, klaar om te tekenen: waskommen eerst, dan van links naar rechts. */
export function tekenGaten(gaten: Gat[], c: GatenContext): TekenGat[] {
  const uit: Omit<TekenGat, 'nr'>[] = []
  gaten.forEach((g, index) => {
    const p = plaatsGat(g, c)
    if (!p) return
    uit.push(g.soort === 'kom' && c.kom
      ? { soort: 'kom', index, x: p.x, y: p.y, d: 0, b: c.kom.b, h: c.kom.d, radius: c.kom.radius, ovaal: c.kom.ovaal, afvoer: c.kom.afvoer }
      : { soort: g.soort, index, x: p.x, y: p.y, d: p.d })
  })
  uit.sort((a, b) => Number(a.soort !== 'kom') - Number(b.soort !== 'kom') || a.x - b.x || a.y - b.y)
  return uit.map((g, i) => ({ ...g, nr: i + 1 }))
}

/**
 * Waskommen bij een eigen maattekening: gelijk verdeeld over de lengte. De plaats is
 * indicatief; de echte plaats staat op de tekening van de dealer.
 */
export function tekenKommenIndicatief(c: GatenContext): TekenGat[] {
  if (!c.kom) return []
  const n = c.komAantal === 2 ? 2 : 1
  // Past de zichtmaat niet naast elkaar, dan kleiner getekend: het is alleen een aanduiding
  const b = Math.min(c.kom.b, (c.blad.lengte / n) * 0.7)
  return Array.from({ length: n }, (_, i) => ({
    soort: 'kom' as const, nr: i + 1, index: -1, x: (c.blad.lengte / n) * (i + 0.5), y: c.kom!.cy, d: 0,
    b, h: c.kom!.d, radius: c.kom!.radius, ovaal: c.kom!.ovaal, afvoer: c.kom!.afvoer,
  }))
}

const SOORT_NAAM: Record<Exclude<Gat['soort'], 'kom'>, string> = { sifon: 'Sifongat', kraan: 'Kraangat', 'kraan-kom': 'Kraangat' }

/** Naam van een gat voor de dealer en de werkplaats: "Sifongat", "Waskom rechthoekig 500". */
export function gatNaam(g: Pick<TekenGat, 'soort' | 'ovaal' | 'b'>): string {
  if (g.soort !== 'kom') return SOORT_NAAM[g.soort]
  return g.ovaal ? 'Waskom ovaal' : `Waskom rechthoekig ${g.b}`
}

/** Regels voor de tabel onder de tekening: plaats naar het hart, in mm. */
export function gatenTabel(gaten: Gat[], c: GatenContext): { nr: number; soort: string; x: string; y: string; maat: string }[] {
  return tekenGaten(gaten, c).map((g) => ({
    nr: g.nr, soort: gatNaam(g), x: formatMm(g.x), y: formatMm(g.y),
    maat: g.soort === 'kom' ? `${g.b} × ${g.h}` : `Ø ${formatMm(g.d)}`,
  }))
}

// ─── Vooraanzicht van een kast ──────────────────────────────────────────────

export interface TekenKast {
  /** Horizontale lijnen als deel van de hoogte (0 tot 1): deurnaad of legplanken */
  horizontaal: number[]
  /** Verticale lijnen als deel van de breedte */
  verticaal: number[]
  /** Open kast: donker binnenwerk in plaats van een front */
  open: boolean
  spiegel: boolean
}

/** Schematische indeling van de voorkant. Legplanken en deurnaad zijn indicatief. */
export function tekenKast(model: MeubelModel, deuren: number): TekenKast | null {
  const k = model.kast
  if (!k) return null
  if (k.front === 'open') {
    // Ongeveer elke 40 cm een legplank
    const vakken = Math.max(2, Math.round(model.hoogte / 400))
    return { horizontaal: Array.from({ length: vakken - 1 }, (_, i) => (i + 1) / vakken), verticaal: [], open: true, spiegel: false }
  }
  if (k.front === 'spiegel') return { horizontaal: [], verticaal: [0.5], open: false, spiegel: true }
  // Twee gelijke deuren boven elkaar: de naad zit in het midden
  return { horizontaal: deuren === 2 ? [0.5] : [], verticaal: [], open: false, spiegel: false }
}

/**
 * Lichte reflectie op de spiegeldeuren: per deur twee schuine banen, als
 * punten voor een polygon. De banen blijven binnen de deur, dus knippen hoeft niet.
 */
export function spiegelGlans(x: number, y: number, w: number, h: number, verticaal: number[]): { punten: string; dekking: number }[] {
  const grenzen = [0, ...verticaal, 1]
  const uit: { punten: string; dekking: number }[] = []
  for (let i = 0; i < grenzen.length - 1; i++) {
    const px = x + w * grenzen[i], pw = w * (grenzen[i + 1] - grenzen[i])
    // Schuinte: de baan loopt van rechtsboven naar linksonder
    const schuin = Math.min(pw * 0.3, h * 0.25)
    for (const [van, tot, dekking] of [[0.42, 0.66, 0.5], [0.74, 0.8, 0.38]] as const) {
      const a = px + pw * van, b = px + pw * tot
      uit.push({ punten: `${a},${y} ${b},${y} ${b - schuin},${y + h} ${a - schuin},${y + h}`, dekking })
    }
  }
  return uit
}
