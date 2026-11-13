import type { MeubelModel, WaskomVorm } from '@/lib/meubel-config'

// Gaten in het blad van een meubel: sifon- en kraangaten bij hout, kommen en kraangaten
// bij Solid Surface. Alles in mm: X vanaf de linkerkant, Y vanaf de achterkant, naar het
// hart. Scherm, PDF en server rekenen met deze functies, zodat ze nooit uiteenlopen.

export type Gat =
  /** Hout, gat voor de sifon van een opbouwwaskom: vrij te plaatsen, maar niet op een tussenschot */
  | { soort: 'sifon'; x: number; y: number; d: number }
  /** Hout: vrij te plaatsen */
  | { soort: 'kraan'; x: number; y: number; d: number }
  /** Solid Surface: kom boven een vak; vorm en maat horen bij het meubel */
  | { soort: 'kom'; vak: number }
  /** Solid Surface: kraangat bij de kom in dit vak; dx is de afstand tot het hart van de kom (min is links) */
  | { soort: 'kraan-kom'; vak: number; dx: number; d: number }

export type Tekenwijze = 'module' | 'upload'
export type GatenSoort = 'hout' | 'solid'
export type KomMaat = 500 | 850

export const GAT = {
  /** Vrije ruimte tussen de rand van een sifongat en een tussenschot */
  schot: 30,
  /** Doorsnee van de gemiddelde opbouwwaskom, als hulplijn bij het plaatsen van het sifongat */
  komRef: 400,
  /** Rand van een gat tot de rand van het blad (opgave LoooX) */
  rand: 30,
  /** Rand van een gat tot de rand van een ander gat */
  tussen: 30,
  sifon: { min: 30, max: 100, std: 45 },
  kraan: { min: 20, max: 60, std: 35 },
  /** Kraangat in een Solid Surface blad: vaste Y, X tot een stukje voorbij de kom */
  komKraan: { min: 20, max: 40, std: 34, y: 45.5, voorbij: 50 },
  /** Een lade is minstens zoveel breder dan de kom (75 mm aan elke kant) */
  komMarge: 150,
  /** Zoveel uitsparingen kunnen er hooguit betaald in één blad */
  max: 10,
  /** Vanaf deze lengte krijgt een blad zonder lades drie snappunten in plaats van één */
  driePunten: 1200,
} as const

export interface Kom {
  /** Zichtmaat: breedte en diepte */
  b: number
  d: number
  /** Hart uit de achterkant */
  cy: number
  radius: number
  afvoer: number
  ovaal: boolean
}

/**
 * Maten van de kommen. Rechthoekig 500: tekening Marlan 206646. De 850 heeft dezelfde
 * diepte en hetzelfde hart aangenomen; de ovale kom is voorlopig, de echte maat volgt.
 */
const KOMMEN: Record<'ovaal' | 'vierkant-500' | 'vierkant-850', Kom> = {
  'vierkant-500': { b: 500, d: 298, cy: 240, radius: 52, afvoer: 50, ovaal: false },
  'vierkant-850': { b: 850, d: 298, cy: 240, radius: 52, afvoer: 50, ovaal: false },
  ovaal: { b: 500, d: 298, cy: 240, radius: 149, afvoer: 50, ovaal: true },
}

/** De ovale kom bestaat in één maat; alleen de rechthoekige ook in 850. */
export function getKom(vorm: WaskomVorm, maat?: KomMaat | null): Kom {
  if (vorm === 'ovaal') return KOMMEN.ovaal
  return maat === 850 ? KOMMEN['vierkant-850'] : KOMMEN['vierkant-500']
}

const ZONDER_MODULE = new Set(['facet-deco', 'block', 'niche-shelf', 'wall-shelf-free', 'cover'])

/** Welke gaten kan dit model krijgen in de tekenmodule; null als het model er geen heeft. */
export function gatenSoort(model: MeubelModel): GatenSoort | null {
  if (model.artikel || ZONDER_MODULE.has(model.id)) return null
  if (model.kast && model.kast.uitsparing !== true) return null
  return model.waskom ? 'solid' : 'hout'
}

export interface Blad {
  lengte: number
  diepte: number
  /** Snapvakken van links naar rechts: de lades, zonder regaalkast */
  vakken: { x0: number; x1: number }[]
  /** Geen lades: de vakken zijn een verdeling van het blad zelf */
  los: boolean
}

export function maakBlad(o: {
  model: MeubelModel
  lengte: number
  diepte: number
  /** Breedte per lade in mm; leeg bij een blad, plank of kastje zonder lades */
  breedtes: number[]
  regaal?: { breedte: number; zijde: 'links' | 'rechts' | 'midden' } | null
  /** Solid Surface zonder lades: bij twee kommen krijgt elke helft een snappunt */
  komAantal?: number
}): Blad {
  const { model, lengte, diepte, breedtes, regaal } = o
  const vakken: Blad['vakken'] = []
  if (breedtes.length === 0) {
    const delen = model.waskom ? (o.komAantal === 2 ? 2 : 1) : lengte >= GAT.driePunten ? 3 : 1
    for (let i = 0; i < delen; i++) vakken.push({ x0: (lengte / delen) * i, x1: (lengte / delen) * (i + 1) })
    return { lengte, diepte, vakken, los: true }
  }
  let cx = model.rand ?? 0
  const sla = () => { if (regaal && regaal.breedte > 0) cx += regaal.breedte }
  if (regaal?.zijde === 'links') sla()
  breedtes.forEach((b, i) => {
    if (regaal?.zijde === 'midden' && i === 1) sla()
    vakken.push({ x0: cx, x1: cx + b })
    cx += b
  })
  return { lengte, diepte, vakken, los: false }
}

const EPS = 1e-6
const past = (vak: { x0: number; x1: number }, kom: Kom) => vak.x1 - vak.x0 + EPS >= kom.b + GAT.komMarge

/** Tussenschotten: de scheidingen tussen lades (en naast een regaalkast), X in mm. Een blad zonder lades heeft er geen. */
export function schotten(blad: Blad): number[] {
  if (blad.los) return []
  const xs = blad.vakken.flatMap((v) => [v.x0, v.x1]).filter((x) => x > 0.5 && x < blad.lengte - 0.5)
  return [...new Set(xs.map((x) => Math.round(x * 10) / 10))]
}

/** Snappunten: het hart van elk vak. Met een kom alleen de vakken waar die kom boven past. */
export function snappunten(blad: Blad, kom?: Kom | null): { vak: number; x: number }[] {
  return blad.vakken
    .map((v, vak) => ({ vak, x: (v.x0 + v.x1) / 2, ok: !kom || past(v, kom) }))
    .filter((s) => s.ok)
    .map(({ vak, x }) => ({ vak, x }))
}

/** Hoeveel kommen van deze maat er in het blad kunnen: 0, 1 of 2. */
export function komMax(blad: Blad, kom: Kom): 0 | 1 | 2 {
  if (blad.los) {
    if (blad.lengte / 2 + EPS >= kom.b + GAT.komMarge) return 2
    return blad.lengte + EPS >= kom.b + GAT.komMarge ? 1 : 0
  }
  return Math.min(2, snappunten(blad, kom).length) as 0 | 1 | 2
}

export interface GatenContext {
  soort: GatenSoort
  blad: Blad
  /** De gekozen kom (Solid Surface), anders null */
  kom: Kom | null
  komAantal: number
}

export interface GeplaatstGat { x: number; y: number; d: number; b?: number; h?: number }

const vakHart = (c: GatenContext, vak: number): number | null => {
  const v = Number.isInteger(vak) ? c.blad.vakken[vak] : undefined
  return v ? (v.x0 + v.x1) / 2 : null
}

/** Absolute plaats van een gat; null als het vak niet (meer) bestaat of de kom ontbreekt. */
export function plaatsGat(g: Gat, c: GatenContext): GeplaatstGat | null {
  if (g.soort === 'kraan' || g.soort === 'sifon') return { x: g.x, y: g.y, d: g.d }
  const x = vakHart(c, g.vak)
  if (x === null) return null
  if (!c.kom) return null
  if (g.soort === 'kom') return { x, y: c.kom.cy, d: 0, b: c.kom.b, h: c.kom.d }
  return { x: x + g.dx, y: GAT.komKraan.y, d: g.d }
}

const klem = (n: number, min: number, max: number, std: number) => {
  const v = Number.isFinite(n) ? Math.round(n) : std
  return max < min ? Math.round((min + max) / 2) : Math.min(max, Math.max(min, v))
}

/** Houdt maat en plaats van één gat binnen de grenzen, op hele mm. Een leeg of onzinnig getal wordt de standaard. */
export function klemGat(g: Gat, c: GatenContext): Gat {
  const { lengte, diepte } = c.blad
  if (g.soort === 'kom') return { soort: 'kom', vak: g.vak }
  if (g.soort === 'sifon') {
    const d = klem(g.d, GAT.sifon.min, GAT.sifon.max, GAT.sifon.std)
    const marge = GAT.rand + d / 2
    let x = klem(g.x, Math.ceil(marge), Math.floor(lengte - marge), Math.round(lengte / 2))
    // Niet op een tussenschot: het gat schuift naar de kant waar het al stond
    const vrij = GAT.schot + d / 2
    for (const sx of schotten(c.blad)) {
      if (Math.abs(x - sx) < vrij - EPS) x = x >= sx ? Math.ceil(sx + vrij) : Math.floor(sx - vrij)
    }
    return { soort: 'sifon', x, y: klem(g.y, Math.ceil(marge), Math.floor(diepte - marge), Math.min(240, Math.round(diepte / 2))), d }
  }
  if (g.soort === 'kraan') {
    const d = klem(g.d, GAT.kraan.min, GAT.kraan.max, GAT.kraan.std)
    const marge = GAT.rand + d / 2
    return {
      soort: 'kraan', d,
      x: klem(g.x, Math.ceil(marge), Math.floor(lengte - marge), Math.round(lengte / 2)),
      y: klem(g.y, Math.ceil(marge), Math.floor(diepte - marge), Math.round(diepte / 2)),
    }
  }
  const d = klem(g.d, GAT.komKraan.min, GAT.komKraan.max, GAT.komKraan.std)
  const hart = vakHart(c, g.vak)
  const bereik = (c.kom?.b ?? 0) / 2 + GAT.komKraan.voorbij
  const marge = GAT.rand + d / 2
  const min = hart === null ? -bereik : Math.max(-bereik, marge - hart)
  const max = hart === null ? bereik : Math.min(bereik, lengte - marge - hart)
  return { soort: 'kraan-kom', vak: g.vak, dx: klem(g.dx, Math.ceil(min), Math.floor(max), 0), d }
}

const tussen = (n: number, min: number, max: number) => Number.isFinite(n) && n + EPS >= min && n - EPS <= max

/** Controleert alle gaten samen. Foutmelding voor de dealer, of null als alles te maken is. */
export function valideerGaten(gaten: Gat[], c: GatenContext): string | null {
  if (!Array.isArray(gaten)) return 'Ongeldige tekening.'
  if (betaaldeGaten(gaten) > GAT.max) return `Er kunnen maximaal ${GAT.max} uitsparingen in één blad.`
  const { lengte, diepte } = c.blad
  const bezet = new Set<string>()
  const rondjes: GeplaatstGat[] = []

  for (const g of gaten) {
    const hout = g.soort === 'sifon' || g.soort === 'kraan'
    if (hout !== (c.soort === 'hout')) return 'Dit gat hoort niet bij dit meubel.'
    const p = plaatsGat(g, c)
    if (!p) return 'Een gat staat boven een lade die er niet meer is.'

    if (g.soort === 'kom' || g.soort === 'kraan-kom') {
      const sleutel = `${g.soort === 'kraan-kom' ? 'kraan' : 'vak'}:${g.vak}`
      if (bezet.has(sleutel)) return g.soort === 'kraan-kom' ? 'Bij een waskom kan één kraangat.' : 'Boven een lade kan één gat of waskom.'
      bezet.add(sleutel)
    }

    if (g.soort === 'kom') {
      if (!c.kom || !snappunten(c.blad, c.kom).some((s) => s.vak === g.vak)) return 'De waskom past niet boven deze lade.'
      continue
    }

    const grens = g.soort === 'sifon' ? GAT.sifon : g.soort === 'kraan' ? GAT.kraan : GAT.komKraan
    if (!tussen(p.d, grens.min, grens.max)) return `De diameter moet tussen ${grens.min} en ${grens.max} mm zijn.`
    const r = p.d / 2
    if (!tussen(p.x, GAT.rand + r, lengte - GAT.rand - r)) return `Een gat moet minstens ${GAT.rand} mm van de rand blijven.`

    if (g.soort === 'kraan-kom') {
      if (!c.kom || !gaten.some((k) => k.soort === 'kom' && k.vak === g.vak)) return 'Een kraangat hoort bij een geplaatste waskom.'
      if (!tussen(g.dx, -(c.kom.b / 2 + GAT.komKraan.voorbij), c.kom.b / 2 + GAT.komKraan.voorbij)) return `Het kraangat mag tot ${GAT.komKraan.voorbij} mm voorbij de waskom.`
      continue
    }

    if (!tussen(p.y, GAT.rand + r, diepte - GAT.rand - r)) return `Een gat moet minstens ${GAT.rand} mm van de rand blijven.`
    if (g.soort === 'sifon' && schotten(c.blad).some((sx) => Math.abs(p.x - sx) + EPS < GAT.schot + r)) return `Het sifongat moet minstens ${GAT.schot} mm van het tussenschot tussen twee lades blijven.`
    if (rondjes.some((o) => Math.hypot(o.x - p.x, o.y - p.y) - o.d / 2 - r + EPS < GAT.tussen)) return `Tussen twee gaten moet minstens ${GAT.tussen} mm blijven.`
    rondjes.push(p)
  }

  if (gaten.filter((g) => g.soort === 'kom').length > c.komAantal) return 'Er staan meer waskommen in de tekening dan gekozen.'
  return null
}

/**
 * Na een maatwijziging: gaten die nog te maken zijn blijven (binnen de grenzen gehouden),
 * de rest vervalt. Geeft terug hoeveel er vervallen zijn, voor de melding aan de dealer.
 */
export function herzieGaten(gaten: Gat[], c: GatenContext): { gaten: Gat[]; vervallen: number } {
  const blijft = new Set<number>()
  let goed: { g: Gat; i: number }[] = []
  // Kommen eerst: een kraangat is alleen geldig als zijn kom er staat
  const volgorde = gaten.map((g, i) => ({ g, i })).sort((a, b) => Number(a.g.soort !== 'kom') - Number(b.g.soort !== 'kom'))
  for (const { g, i } of volgorde) {
    const hout = g.soort === 'sifon' || g.soort === 'kraan'
    if (hout !== (c.soort === 'hout') || plaatsGat(g, c) === null) continue
    const kandidaat = [...goed, { g: klemGat(g, c), i }]
    if (valideerGaten(kandidaat.map((k) => k.g), c) === null) { goed = kandidaat; blijft.add(i) }
  }
  goed.sort((a, b) => a.i - b.i)
  return { gaten: goed.map((k) => k.g), vervallen: gaten.length - blijft.size }
}

/** Aantal uitsparingen waarvoor betaald wordt: elk gat, behalve de kom zelf. */
export function betaaldeGaten(gaten: Gat[]): number {
  return gaten.filter((g) => g.soort !== 'kom').length
}

/** Staan alle gekozen kommen in de tekening? Bij hout is er niets verplicht. */
export function kommenCompleet(gaten: Gat[], c: GatenContext): boolean {
  if (c.soort !== 'solid') return true
  return gaten.filter((g) => g.soort === 'kom').length === c.komAantal
}

/** Valt er niets te kiezen (één plek, één kom), dan staat de kom er meteen. */
export function startGaten(c: GatenContext): Gat[] {
  if (c.soort !== 'solid' || !c.kom) return []
  const punten = snappunten(c.blad, c.kom)
  if (punten.length === c.komAantal) return punten.map((p) => ({ soort: 'kom' as const, vak: p.vak }))
  return []
}

/**
 * De gaten zoals ze nu gelden: wat na een maatwijziging niet meer te maken is valt weg, en
 * een waskom waar niets aan te kiezen valt staat er vanzelf (met zijn kraangat, als dat er was).
 */
export function werkGaten(gaten: Gat[], c: GatenContext): { gaten: Gat[]; vervallen: number } {
  const herzien = herzieGaten(gaten, c)
  const vast = startGaten(c)
  if (vast.length === 0 || kommenCompleet(herzien.gaten, c)) return herzien
  const kranen = herzien.gaten.filter((g) => g.soort === 'kraan-kom' && vast.some((k) => k.soort === 'kom' && k.vak === g.vak))
  return { gaten: [...vast, ...kranen], vervallen: herzien.vervallen }
}

/** Steekt een gemiddelde opbouwwaskom (Ø 400) rond dit sifongat over de rand van het blad? Alleen een waarschuwing. */
export function komOverRand(g: Gat, c: GatenContext): boolean {
  if (g.soort !== 'sifon') return false
  const r = GAT.komRef / 2
  return g.x - r < -EPS || g.x + r > c.blad.lengte + EPS || g.y - r < -EPS || g.y + r > c.blad.diepte + EPS
}

/**
 * Leest opgeslagen gaten: alleen bekende vormen blijven. Een sifongat uit de eerste versie
 * (boven het hart van een lade, met "vak") krijgt zijn X in mm.
 */
export function leesGaten(ruw: unknown, c: GatenContext): Gat[] {
  if (!Array.isArray(ruw)) return []
  const uit: Gat[] = []
  for (const g of ruw) {
    const o = g as Record<string, unknown> | null
    if (!o || typeof o !== 'object') continue
    const n = (k: string) => typeof o[k] === 'number' && Number.isFinite(o[k] as number)
    if (o.soort === 'sifon' && n('y') && n('d')) {
      const x = n('x') ? o.x as number : n('vak') ? vakHart(c, o.vak as number) : null
      if (x !== null) uit.push({ soort: 'sifon', x, y: o.y as number, d: o.d as number })
    } else if (o.soort === 'kraan' && n('x') && n('y') && n('d')) uit.push({ soort: 'kraan', x: o.x as number, y: o.y as number, d: o.d as number })
    else if (o.soort === 'kom' && n('vak')) uit.push({ soort: 'kom', vak: o.vak as number })
    else if (o.soort === 'kraan-kom' && n('vak') && n('dx') && n('d')) uit.push({ soort: 'kraan-kom', vak: o.vak as number, dx: o.dx as number, d: o.d as number })
  }
  return uit
}
