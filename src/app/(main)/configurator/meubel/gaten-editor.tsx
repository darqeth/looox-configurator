'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Trash2, X } from 'lucide-react'
import { formatMm, type KomKeuze } from '@/lib/meubel-config'
import {
  GAT, betaaldeGaten, klemGat, komOverRand, plaatsGat, snappunten, valideerGaten, werkGaten,
  type Gat, type GatenContext,
} from '@/lib/meubel-gaten'
import { gatNaam, tekenGaten, type TekenGat } from '@/lib/meubel-tekening'
import { GatVorm } from './blad-gaten'

// Tekenvenster: de dealer zet gaten en waskommen op het bovenaanzicht van het blad.
// De tekening rekent in mm (viewBox), zodat slepen en typen dezelfde maten opleveren.
// Elke wijziging gaat door klemGat en valideerGaten: wat niet te maken is, komt er niet in.

type Soort = Gat['soort']

const LEGENDA: Record<Soort, { naam: string; hulp: string }> = {
  sifon: { naam: 'Sifongat', hulp: 'Het gat onder de waskom. Klik op het blad, of op een bolletje midden boven een lade. Daarna kun je het slepen of de maten typen. Tijdens het slepen zie je een waskom van 40 cm als hulplijn.' },
  kraan: { naam: 'Kraangat', hulp: 'Klik op het blad waar het kraangat moet komen. Daarna kun je het slepen of de maten typen.' },
  kom: { naam: 'Waskom', hulp: 'Klik op een bolletje om de waskom boven die lade te plaatsen.' },
  'kraan-kom': { naam: 'Kraangat', hulp: 'Klik op het plusje achter een waskom. Het gat schuift daarna naar links of rechts.' },
}

export default function GatenEditor({ context: beginContext, gaten: start, onKlaar, onSluiten, titel, prijsPerStuk = null, bezig = false, komKeuzes, komKeuze: beginKeuze = 0 }: {
  context: GatenContext
  gaten: Gat[]
  /** De dealer is klaar: de gaten zijn te maken. Bij Solid Surface gaat de gekozen waskom mee. */
  onKlaar: (gaten: Gat[], kom?: KomKeuze) => void
  /** Solid Surface: de waskommen waartussen in het venster gewisseld kan worden, en welke nu gekozen is */
  komKeuzes?: KomKeuze[]
  komKeuze?: number
  onSluiten: () => void
  titel: string
  /** Prijs van één uitsparing als tekst; null als er geen prijs getoond wordt (op aanvraag) */
  prijsPerStuk?: string | null
  bezig?: boolean
}) {
  const [keuze, setKeuze] = useState(beginKeuze)
  const context = komKeuzes?.[keuze]?.context ?? beginContext
  const hout = context.soort === 'hout'
  const { lengte, diepte, vakken, los } = context.blad
  const soorten: Soort[] = hout ? ['sifon', 'kraan'] : ['kom', 'kraan-kom']
  const [gaten, setGaten] = useState<Gat[]>(start)
  const [actief, setActief] = useState<Soort>(soorten[0])
  const [gekozen, setGekozen] = useState<number | null>(null)
  const [melding, setMelding] = useState<string | null>(null)
  /** Index van het gat dat nu gesleept wordt, voor de hulplijn van de waskom */
  const [sleept, setSleept] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const sleep = useRef<{ index: number; bewogen: boolean } | null>(null)
  const sluitRef = useRef<HTMLButtonElement>(null)
  const titelId = useId()

  useEffect(() => {
    sluitRef.current?.focus()
    const opToets = (e: KeyboardEvent) => { if (e.key === 'Escape') onSluiten() }
    document.addEventListener('keydown', opToets)
    return () => document.removeEventListener('keydown', opToets)
  }, [onSluiten])

  // Marge rond het blad voor de labels, en de maat van één schermpixel in mm (bij benadering)
  const marge = Math.max(70, lengte * 0.05)
  const px = (lengte + marge * 2) / 760
  const getekend = useMemo(() => tekenGaten(gaten, context), [gaten, context])
  const punten = useMemo(() => snappunten(context.blad, context.kom), [context])
  const bezetVak = new Set(gaten.flatMap((g) => (g.soort === 'kom' ? [g.vak] : [])))
  const kommen = gaten.filter((g) => g.soort === 'kom')
  const gekozenGat = gekozen !== null ? gaten[gekozen] ?? null : null
  const gekozenPlaats = gekozenGat ? plaatsGat(gekozenGat, context) : null

  /** Voert een nieuwe lijst door als hij te maken is; anders blijft alles staan en volgt een melding. */
  function probeer(volgende: Gat[], kies?: number | null): boolean {
    const fout = valideerGaten(volgende, context)
    if (fout) { setMelding(fout); return false }
    setGaten(volgende)
    setMelding(null)
    if (kies !== undefined) setGekozen(kies)
    return true
  }

  function wijzig(index: number, gat: Gat) {
    probeer(gaten.map((g, i) => (i === index ? klemGat(gat, context) : g)))
  }

  function verwijder(index: number) {
    const weg = gaten[index]
    // Met de waskom verdwijnt ook zijn kraangat
    const rest = gaten.filter((g, i) => i !== index && !(weg.soort === 'kom' && g.soort === 'kraan-kom' && g.vak === weg.vak))
    setGaten(rest)
    setGekozen(null)
    setMelding(null)
  }

  function plaatsOpSnappunt(vak: number) {
    if (actief === 'sifon') {
      const x = punten.find((p) => p.vak === vak)?.x ?? lengte / 2
      probeer([...gaten, klemGat({ soort: 'sifon', x, y: 240, d: GAT.sifon.std }, context)], gaten.length)
      return
    }
    if (actief !== 'kom') return
    if (kommen.length < context.komAantal) { probeer([...gaten, { soort: 'kom', vak }], gaten.length); return }
    if (context.komAantal === 1) {
      // Eén waskom: klikken op een andere lade verplaatst hem, met zijn kraangat
      const oud = (kommen[0] as { vak: number }).vak
      const verplaatst = gaten.map((g) => (g.soort === 'kom' ? { ...g, vak } : g.soort === 'kraan-kom' && g.vak === oud ? klemGat({ ...g, vak }, context) : g))
      probeer(verplaatst, verplaatst.findIndex((g) => g.soort === 'kom'))
      return
    }
    setMelding('Alle waskommen staan er al. Verwijder er eerst een om hem te verplaatsen.')
  }

  function kraanBijKom(vak: number) {
    const bestaand = gaten.findIndex((g) => g.soort === 'kraan-kom' && g.vak === vak)
    if (bestaand >= 0) { setGekozen(bestaand); return }
    probeer([...gaten, klemGat({ soort: 'kraan-kom', vak, dx: 0, d: GAT.komKraan.std }, context)], gaten.length)
  }

  /** Plaats van de muis of vinger in mm op het blad. */
  function naarMm(e: { clientX: number; clientY: number }): { x: number; y: number } | null {
    const svg = svgRef.current
    const m = svg?.getScreenCTM()
    if (!svg || !m) return null
    const p = svg.createSVGPoint()
    p.x = e.clientX; p.y = e.clientY
    const r = p.matrixTransform(m.inverse())
    return { x: r.x, y: r.y }
  }

  function versleep(e: React.PointerEvent) {
    const s = sleep.current
    const p = s ? naarMm(e) : null
    const g = s ? gaten[s.index] : null
    if (!s || !p || !g) return
    s.bewogen = true
    if (g.soort === 'sifon' || g.soort === 'kraan') wijzig(s.index, { ...g, x: p.x, y: p.y })
    else if (g.soort === 'kraan-kom') {
      const hart = plaatsGat({ soort: 'kom', vak: g.vak }, context)?.x
      if (hart !== undefined) wijzig(s.index, { ...g, dx: p.x - hart })
    }
  }

  function opBlad(e: React.PointerEvent) {
    if (actief !== 'kraan' && actief !== 'sifon') { setGekozen(null); return }
    const p = naarMm(e)
    if (!p) return
    probeer([...gaten, klemGat({ soort: actief, x: p.x, y: p.y, d: GAT[actief].std }, context)], gaten.length)
  }

  function opToets(e: React.KeyboardEvent, index: number) {
    const g = gaten[index]
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); verwijder(index); return }
    const stap = e.shiftKey ? 10 : 1
    const dx = e.key === 'ArrowLeft' ? -stap : e.key === 'ArrowRight' ? stap : 0
    const dy = e.key === 'ArrowUp' ? -stap : e.key === 'ArrowDown' ? stap : 0
    if (!dx && !dy) return
    e.preventDefault()
    if (g.soort === 'sifon' || g.soort === 'kraan') wijzig(index, { ...g, x: g.x + dx, y: g.y + dy })
    else if (g.soort === 'kraan-kom' && dx) wijzig(index, { ...g, dx: g.dx + dx })
  }

  const sleeptGat = sleept !== null ? gaten[sleept] ?? null : null
  // De waarschuwing blijft staan zolang het gat gekozen is, ook na het loslaten
  const overRand = !!gekozenGat && komOverRand(gekozenGat, context)

  /** Andere waskom: wat blijft passen blijft staan, de rest vervalt */
  function wisselKom(i: number) {
    const nieuw = komKeuzes?.[i]
    if (!nieuw || !nieuw.past || i === keuze) return
    setKeuze(i)
    setGaten(werkGaten(gaten, nieuw.context).gaten)
    setGekozen(null)
    setMelding(null)
  }

  const aantal = betaaldeGaten(gaten)
  const nogTePlaatsen = !hout && kommen.length < context.komAantal
  const lijn = '#26282B'

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-4" onClick={onSluiten}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titelId}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[94vh] overflow-auto p-4 sm:p-6"
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h2 id={titelId} className="text-[15px] font-semibold text-lx-text-primary">Tekening van het blad</h2>
            <p className="text-[12px] text-lx-text-secondary">{titel}</p>
          </div>
          <button
            ref={sluitRef}
            onClick={onSluiten}
            aria-label="Sluiten zonder opslaan"
            className="w-9 h-9 rounded-lg text-lx-text-muted hover:text-lx-text-primary hover:bg-lx-panel-bg flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Solid Surface: wisselen van waskom zonder het venster te verlaten */}
        {komKeuzes && komKeuzes.length > 1 && (
          <div className="mb-3">
            <p className="text-[12px] font-medium text-lx-text-secondary mb-1.5">Waskom</p>
            <div role="radiogroup" aria-label="Vorm en maat van de waskom" className="flex flex-wrap gap-2">
              {komKeuzes.map((k, i) => (
                <button
                  key={k.naam}
                  role="radio"
                  aria-checked={keuze === i}
                  disabled={!k.past}
                  title={k.past ? undefined : 'Past niet boven deze lades: een lade moet minstens 15 cm breder zijn dan de waskom'}
                  onClick={() => wisselKom(i)}
                  className={`px-3.5 py-2 rounded-xl text-[13px] font-medium border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    keuze === i ? 'border-lx-cta bg-lx-icon-bg text-lx-text-primary' : 'bg-white text-lx-text-secondary border-black/10 hover:text-lx-text-primary'
                  }`}
                >
                  {k.naam}{k.maat ? ' mm' : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Legenda: wat ga je plaatsen */}
        <div role="radiogroup" aria-label="Wat wil je plaatsen" className="flex flex-wrap gap-2 mb-2">
          {soorten.map((s) => (
            <button
              key={s}
              role="radio"
              aria-checked={actief === s}
              onClick={() => { setActief(s); setMelding(null) }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-medium border transition-colors cursor-pointer ${
                actief === s ? 'bg-lx-cta text-white border-lx-cta' : 'bg-white text-lx-text-primary border-black/10 hover:bg-lx-panel-bg'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                {s === 'kom'
                  ? <rect x="1.5" y="4" width="13" height="8" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
                  : <><circle cx="8" cy="8" r={s === 'sifon' ? 5.5 : 3.5} fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="0.8" /></>}
              </svg>
              {LEGENDA[s].naam}
            </button>
          ))}
        </div>
        <p className="text-[12px] text-lx-text-secondary mb-3">{LEGENDA[actief].hulp}</p>

        {/* Bovenaanzicht in mm */}
        <div className="bg-lx-panel-bg rounded-xl p-2 sm:p-3">
          <svg
            ref={svgRef}
            viewBox={`${-marge} ${-marge} ${lengte + marge * 2} ${diepte + marge * 2}`}
            className="w-full h-auto touch-none select-none"
            role="group"
            aria-label={`Bovenaanzicht van het blad, ${lengte} bij ${diepte} mm`}
            onPointerMove={versleep}
            onPointerUp={() => { sleep.current = null; setSleept(null) }}
            onPointerCancel={() => { sleep.current = null; setSleept(null) }}
          >
            <text x={lengte / 2} y={-marge * 0.35} textAnchor="middle" fontSize={11 * px} fill="var(--lx-text-secondary)">Achterkant (muur) · {lengte} mm</text>
            <text x={lengte / 2} y={diepte + marge * 0.7} textAnchor="middle" fontSize={11 * px} fill="var(--lx-text-secondary)">Voorkant</text>
            <rect
              x={0} y={0} width={lengte} height={diepte} rx={2 * px}
              fill={hout ? '#F3EEE4' : '#FBFAF7'} stroke={lijn} strokeWidth={1.5 * px}
              className={actief === 'kraan' || actief === 'sifon' ? 'cursor-crosshair' : undefined}
              onPointerDown={opBlad}
            />
            {/* Zone waar geen gat mag komen: 30 mm langs de rand van een houten blad */}
            {hout && <rect x={GAT.rand} y={GAT.rand} width={lengte - GAT.rand * 2} height={diepte - GAT.rand * 2} fill="none" stroke={lijn} strokeOpacity="0.25" strokeWidth={0.8 * px} strokeDasharray={`${4 * px} ${4 * px}`} pointerEvents="none" />}
            {/* Ladevakken */}
            {!los && vakken.map((v, i) => (
              <g key={`vak${i}`} pointerEvents="none">
                {[v.x0, v.x1].filter((gx) => gx > 0.5 && gx < lengte - 0.5).map((gx) => (
                  <line key={gx} x1={gx} y1={0} x2={gx} y2={diepte} stroke={lijn} strokeOpacity="0.4" strokeWidth={0.8 * px} strokeDasharray={`${5 * px} ${4 * px}`} />
                ))}
                <text x={(v.x0 + v.x1) / 2} y={diepte - 8 * px} textAnchor="middle" fontSize={10 * px} fill="var(--lx-text-muted)">Lade {i + 1}</text>
              </g>
            ))}

            {/* Maatlijnen van het gekozen gat: vanaf links en vanaf de achterkant */}
            {gekozenGat && gekozenPlaats && gekozenGat.soort !== 'kom' && (
              <g pointerEvents="none" stroke="var(--lx-cta)" strokeWidth={0.8 * px} fill="var(--lx-cta)" fontSize={10 * px}>
                <line x1={0} y1={gekozenPlaats.y} x2={gekozenPlaats.x} y2={gekozenPlaats.y} strokeDasharray={`${3 * px} ${3 * px}`} />
                <line x1={gekozenPlaats.x} y1={0} x2={gekozenPlaats.x} y2={gekozenPlaats.y} strokeDasharray={`${3 * px} ${3 * px}`} />
                <text x={gekozenPlaats.x / 2} y={gekozenPlaats.y - 4 * px} textAnchor="middle" stroke="none">{formatMm(gekozenPlaats.x)}</text>
                <text x={gekozenPlaats.x + 5 * px} y={gekozenPlaats.y / 2 + 3 * px} stroke="none">{formatMm(gekozenPlaats.y)}</text>
              </g>
            )}

            {/* Hulplijn tijdens het slepen van een sifongat: de gemiddelde opbouwwaskom van 40 cm */}
            {sleeptGat?.soort === 'sifon' && (
              <circle cx={sleeptGat.x} cy={sleeptGat.y} r={GAT.komRef / 2} fill="none" stroke={overRand ? '#B45309' : lijn} strokeOpacity={overRand ? 0.9 : 0.45} strokeWidth={1 * px} strokeDasharray={`${5 * px} ${4 * px}`} pointerEvents="none" />
            )}

            {/* Geplaatste gaten en waskommen */}
            {getekend.map((g: TekenGat) => {
              const bron = gaten[g.index]
              const versleepbaar = bron.soort !== 'kom'
              return (
                <GatVorm
                  key={`${g.soort}-${g.index}`}
                  gat={g} x0={0} y0={0} schaal={1} lijn={lijn} dun={1.3 * px} geselecteerd={gekozen === g.index}
                  tabIndex={0}
                  role="button"
                  aria-label={`${gatNaam(g)}, ${formatMm(g.x)} mm vanaf links, ${formatMm(g.y)} mm vanaf de achterkant${g.d ? `, diameter ${formatMm(g.d)} mm` : ''}`}
                  className={`outline-none focus-visible:[&>*:first-child]:stroke-[var(--lx-cta)] ${versleepbaar ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
                  onKeyDown={(e) => opToets(e, g.index)}
                  onFocus={() => setGekozen(g.index)}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    setGekozen(g.index)
                    setMelding(null)
                    if (bron.soort === 'kom' && actief === 'kraan-kom') { kraanBijKom(bron.vak); return }
                    if (!versleepbaar) return
                    sleep.current = { index: g.index, bewogen: false }
                    setSleept(g.index)
                    svgRef.current?.setPointerCapture(e.pointerId)
                  }}
                />
              )
            })}

            {/* Lege snappunten boven de lades */}
            {(actief === 'sifon' || actief === 'kom') && punten.filter((p) => (hout ? !gaten.some((g) => g.soort === 'sifon' && Math.abs(g.x - p.x) < 1) : !bezetVak.has(p.vak))).map((p) => {
              const cy = hout ? Math.min(240, diepte / 2) : context.kom?.cy ?? diepte / 2
              return (
                <g key={`snap${p.vak}`} role="button" tabIndex={0} aria-label={`${LEGENDA[actief].naam} plaatsen boven ${los ? 'het blad' : `lade ${p.vak + 1}`}`} className="cursor-pointer outline-none group"
                  onPointerDown={(e) => { e.stopPropagation(); plaatsOpSnappunt(p.vak) }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); plaatsOpSnappunt(p.vak) } }}
                >
                  {/* Ruim aanraakvlak rond een klein bolletje */}
                  <circle cx={p.x} cy={cy} r={Math.min(24 * px, diepte * 0.4)} fill="transparent" />
                  <circle cx={p.x} cy={cy} r={9 * px} fill="var(--lx-cta)" fillOpacity="0.15" stroke="var(--lx-cta)" strokeWidth={1.4 * px} strokeDasharray={`${3 * px} ${2.5 * px}`} className="group-hover:fill-opacity-40 group-focus-visible:fill-opacity-60" />
                  <path d={`M${p.x - 4 * px} ${cy}h${8 * px}M${p.x} ${cy - 4 * px}v${8 * px}`} stroke="var(--lx-cta)" strokeWidth={1.4 * px} />
                </g>
              )
            })}

            {/* Solid Surface: plusje achter elke waskom zonder kraangat */}
            {actief === 'kraan-kom' && kommen.filter((k) => !gaten.some((g) => g.soort === 'kraan-kom' && g.vak === (k as { vak: number }).vak)).map((k) => {
              const vak = (k as { vak: number }).vak
              const hart = plaatsGat(k, context)
              if (!hart) return null
              return (
                <g key={`plus${vak}`} role="button" tabIndex={0} aria-label={`Kraangat toevoegen bij de waskom boven ${los ? 'het blad' : `lade ${vak + 1}`}`} className="cursor-pointer outline-none"
                  onPointerDown={(e) => { e.stopPropagation(); kraanBijKom(vak) }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); kraanBijKom(vak) } }}
                >
                  <circle cx={hart.x} cy={GAT.komKraan.y} r={Math.min(24 * px, 44)} fill="transparent" />
                  <circle cx={hart.x} cy={GAT.komKraan.y} r={8 * px} fill="var(--lx-cta)" fillOpacity="0.15" stroke="var(--lx-cta)" strokeWidth={1.4 * px} strokeDasharray={`${3 * px} ${2.5 * px}`} />
                  <path d={`M${hart.x - 4 * px} ${GAT.komKraan.y}h${8 * px}M${hart.x} ${GAT.komKraan.y - 4 * px}v${8 * px}`} stroke="var(--lx-cta)" strokeWidth={1.4 * px} />
                </g>
              )
            })}
          </svg>
        </div>

        {/* Vaste ruimte voor de melding: verschijnt hij tijdens het slepen, dan mag het blad niet verspringen */}
        <div className="mt-2 min-h-[54px] sm:min-h-[36px]">
          {melding
            ? <p role="alert" className="text-[12.5px] text-red-700 bg-red-50 rounded-lg px-3 py-2">{melding}</p>
            : overRand && <p role="status" className="text-[12.5px] text-amber-800 bg-amber-50 rounded-lg px-3 py-2">Let op: een waskom van 40 cm steekt hier over de rand van het blad.</p>}
        </div>

        {/* Maten van het gekozen gat */}
        <div className="mt-3 min-h-[76px]">
          {gekozenGat && gekozenPlaats && gekozen !== null ? (
            <div className="flex flex-wrap items-end gap-3">
              <p className="w-full sm:w-auto sm:mr-2 text-[13px] font-semibold text-lx-text-primary sm:pb-2.5">
                {gatNaam(getekend.find((g) => g.index === gekozen) ?? { soort: gekozenGat.soort })}
                {'vak' in gekozenGat && !los && <span className="font-normal text-lx-text-secondary"> · lade {gekozenGat.vak + 1}</span>}
              </p>
              {gekozenGat.soort !== 'kom' && (
                <MaatVeld label="Diameter" waarde={gekozenGat.d} onZet={(d) => wijzig(gekozen, { ...gekozenGat, d })} />
              )}
              {(gekozenGat.soort === 'kraan' || gekozenGat.soort === 'sifon') && (
                <MaatVeld label="X vanaf links" waarde={gekozenGat.x} onZet={(x) => wijzig(gekozen, { ...gekozenGat, x })} />
              )}
              {gekozenGat.soort === 'kraan-kom' && (
                <MaatVeld label="X vanaf links" waarde={gekozenPlaats.x} onZet={(x) => wijzig(gekozen, { ...gekozenGat, dx: x - (gekozenPlaats.x - gekozenGat.dx) })} />
              )}
              {(gekozenGat.soort === 'sifon' || gekozenGat.soort === 'kraan') && (
                <MaatVeld label="Y vanaf achterkant" waarde={gekozenGat.y} onZet={(y) => wijzig(gekozen, { ...gekozenGat, y })} />
              )}
              {gekozenGat.soort === 'kraan-kom' && <p className="text-[12px] text-lx-text-secondary pb-2.5">Vaste afstand tot de achterkant: {formatMm(GAT.komKraan.y)} mm</p>}
              {gekozenGat.soort === 'kom' && <p className="text-[12px] text-lx-text-secondary pb-2.5">Klik op een andere lade om te verplaatsen. De maat van de waskom ligt vast.</p>}
              <button
                onClick={() => verwijder(gekozen)}
                className="ml-auto inline-flex items-center gap-1.5 h-10 px-3 rounded-xl text-[13px] font-medium text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <Trash2 size={15} aria-hidden="true" /> Verwijderen
              </button>
            </div>
          ) : (
            <p className="text-[12.5px] text-lx-text-muted pt-2">
              {gaten.length === 0 ? 'Er staat nog niets op het blad.' : 'Klik op een gat om de maten te zien of aan te passen.'}
              {hout && ` Een gat blijft minstens ${GAT.rand} mm van de rand.`}
            </p>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-lx-divider flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12.5px] text-lx-text-secondary" aria-live="polite">
            {!hout && `${kommen.length} van ${context.komAantal} ${context.komAantal === 1 ? 'waskom' : 'waskommen'} geplaatst · `}
            {aantal === 0 ? 'Geen uitsparingen' : `${aantal} ${aantal === 1 ? 'uitsparing' : 'uitsparingen'}`}
            {aantal > 0 && prijsPerStuk && `, ${prijsPerStuk} per stuk`}
            {hout && aantal === 0 && '. Zonder gaten bestellen mag: je maakt ze dan zelf.'}
          </p>
          <div className="flex items-center gap-2 ml-auto">
            {nogTePlaatsen && <span className="text-[12px] text-amber-700">Plaats nog {context.komAantal - kommen.length === 1 ? 'een waskom' : 'de waskommen'} om te kunnen bestellen.</span>}
            <button
              onClick={() => onKlaar(gaten, komKeuzes?.[keuze])}
              disabled={bezig}
              className="h-10 px-5 rounded-xl bg-lx-cta text-white text-[13px] font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer"
            >
              {bezig ? 'Opslaan…' : 'Klaar'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** Maatveld in mm: toepassen bij Enter of als het veld verlaten wordt; de waarde volgt wat er echt is doorgevoerd. */
function MaatVeld({ label, waarde, onZet }: { label: string; waarde: number; onZet: (n: number) => void }) {
  const getoond = formatMm(waarde)
  const [tekst, setTekst] = useState(getoond)
  const [vorige, setVorige] = useState(getoond)
  // Slepen of een afgekeurde invoer: het veld toont weer de echte maat
  if (getoond !== vorige) { setVorige(getoond); setTekst(getoond) }
  const id = useId()
  const pasToe = () => {
    const n = Number(tekst.replace(',', '.'))
    if (tekst.trim() === '' || !Number.isFinite(n)) { setTekst(getoond); return }
    onZet(n)
    setTekst(getoond)
  }
  return (
    <div>
      <label htmlFor={id} className="block text-[11.5px] text-lx-text-secondary mb-1">{label}</label>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={tekst}
          onChange={(e) => setTekst(e.target.value.replace(/[^\d.,]/g, '').slice(0, 6))}
          onBlur={pasToe}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); pasToe() } }}
          className="w-28 h-10 pl-3 pr-9 rounded-xl border border-black/10 bg-white text-[14px] text-lx-text-primary tabular-nums focus:outline-none focus:ring-2 focus:ring-lx-cta"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-lx-text-muted pointer-events-none">mm</span>
      </div>
    </div>
  )
}
