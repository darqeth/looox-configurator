import type { MeubelModel } from '@/lib/meubel-config'

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

// ─── Bovenaanzicht van het Solid Surface blad ───────────────────────────────

export interface TekenWaskom {
  /** Midden van de waskom in mm vanaf de linkerkant en vanaf de achterkant van het blad */
  cx: number
  cy: number
  /** Buitenmaat in mm */
  b: number
  d: number
}

/**
 * Waskommen in het blad, gelijk verdeeld over de lengte. De plaats is indicatief:
 * de echte plaats staat op de maattekening van de dealer.
 */
export function tekenWaskommen(lengte: number, diepte: number, aantal: number): TekenWaskom[] {
  const n = aantal === 2 ? 2 : 1
  const b = Math.min(520, (lengte / n) * 0.62)
  const d = Math.min(360, diepte * 0.7)
  return Array.from({ length: n }, (_, i) => ({ cx: (lengte / n) * (i + 0.5), cy: diepte * 0.52, b, d }))
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
  // Twee deuren boven elkaar
  return { horizontaal: deuren === 2 ? [0.5] : [], verticaal: [], open: false, spiegel: false }
}
