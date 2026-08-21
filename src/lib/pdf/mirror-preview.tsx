import React from 'react'
import { Svg, Rect, Path, Circle, Ellipse, Line, G, Text } from '@react-pdf/renderer'
import { ConfigOptions } from './helpers'

// ─── Gedeelde PDF spiegel-preview ─────────────────────────────────────────────
// Positie-specifieke verlichtingsweergave (boven/onder/links-rechts/rondom),
// gebruikt door zowel de klantofferte als de orderbevestiging. Eén bron van
// waarheid zodat de twee PDF's niet meer uit elkaar lopen.

const GLASS_FILL: Record<string, { fill: string; fillOpacity: number; stroke: string }> = {
  'helder':      { fill: '#C8D4DC', fillOpacity: 0.55, stroke: '#A8B4BC' },
  'smoke-grijs': { fill: '#5A6068', fillOpacity: 0.80, stroke: '#464C54' },
  'smoke-zwart': { fill: '#5A6068', fillOpacity: 0.80, stroke: '#464C54' },
  'smoke-brons': { fill: '#7A5C2A', fillOpacity: 0.82, stroke: '#604820' },
}

export function PdfMirrorPreview({ opts, width: configWidth, height: configHeight }: {
  opts: ConfigOptions
  width: number | null
  height: number | null
}) {
  const SIZE = 110
  const PAD = 14
  const available = SIZE - PAD * 2
  const shape = opts.shape ?? 'rechthoek'
  const glasKleur = (opts.glasKleur as string) ?? 'helder'
  const glass = GLASS_FILL[glasKleur] ?? GLASS_FILL['helder']
  const directPos = (opts.directLight as { position?: string } | null)?.position ?? 'geen'
  const indirectPos = (opts.indirectLight as { position?: string } | null)?.position ?? 'geen'

  const w0 = configWidth ?? 80
  const h0 = configHeight ?? 60
  const ratio = Math.min(available / w0, available / h0)
  const w = Math.round(w0 * ratio)
  const h = Math.round(h0 * ratio)
  const x = (SIZE - w) / 2
  const y = (SIZE - h) / 2

  const hasDirect   = directPos !== 'geen'
  const hasIndirect = indirectPos !== 'geen'
  const GLOW = '#FEF3C7'
  const GLOW_W = 5

  // Position-specific direct light (white lines inside mirror)
  function directLightIndicator(px: number, py: number, pw: number, ph: number, pos: string) {
    const s = { stroke: 'white', strokeWidth: '3', opacity: 0.5, strokeLinecap: 'round' as const }
    if (pos === 'rondom') return <Rect x={px+5} y={py+4} width={pw-10} height={ph-8} rx={1} fill="none" stroke="white" strokeWidth="2.5" opacity={0.45} />
    if (pos === 'boven') return <Line x1={px+6} y1={py+4} x2={px+pw-6} y2={py+4} {...s} />
    if (pos === 'onder') return <Line x1={px+6} y1={py+ph-4} x2={px+pw-6} y2={py+ph-4} {...s} />
    if (pos === 'boven-beneden' || pos === 'boven-onder') return <>{[py+4, py+ph-4].map((ly, i) => <Line key={i} x1={px+6} y1={ly} x2={px+pw-6} y2={ly} {...s} />)}</>
    if (pos === 'links-rechts') return <>{[px+4, px+pw-4].map((lx, i) => <Line key={i} x1={lx} y1={py+6} x2={lx} y2={py+ph-6} {...s} />)}</>
    return <Rect x={px+5} y={py+4} width={pw-10} height={ph-8} rx={1} fill="none" stroke="white" strokeWidth="2.5" opacity={0.45} />
  }

  // Position-specific indirect light (yellow glow outside mirror)
  function indirectLightGlow(px: number, py: number, pw: number, ph: number, pos: string) {
    const g = { stroke: GLOW, strokeWidth: GLOW_W, opacity: 0.8, fill: 'none' as const }
    if (pos === 'rondom') return <Rect x={px-4} y={py-4} width={pw+8} height={ph+8} rx={2} {...g} />
    if (pos === 'boven') return <Line x1={px} y1={py-3} x2={px+pw} y2={py-3} {...g} />
    if (pos === 'onder') return <Line x1={px} y1={py+ph+3} x2={px+pw} y2={py+ph+3} {...g} />
    if (pos === 'boven-beneden' || pos === 'boven-onder') return <>{[py-3, py+ph+3].map((ly, i) => <Line key={i} x1={px} y1={ly} x2={px+pw} y2={ly} {...g} />)}</>
    if (pos === 'links-rechts') return <>{[px-3, px+pw+3].map((lx, i) => <Line key={i} x1={lx} y1={py} x2={lx} y2={py+ph} {...g} />)}</>
    return <Rect x={px-4} y={py-4} width={pw+8} height={ph+8} rx={2} {...g} />
  }

  if (shape === 'rond') {
    const r = Math.min(available / 2, (opts.diameter as number ?? 60) * 0.95 * ratio)
    const cx2 = SIZE / 2
    const cy2 = SIZE / 2
    return (
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {hasIndirect && <Circle cx={cx2} cy={cy2} r={r + 4} fill="none" stroke={GLOW} strokeWidth={GLOW_W} opacity={0.7} />}
        <Circle cx={cx2} cy={cy2} r={r} fill={glass.fill} fillOpacity={glass.fillOpacity} />
        <Circle cx={cx2} cy={cy2} r={r} fill="none" stroke={glass.stroke} strokeWidth="1.2" />
        {hasDirect && <Circle cx={cx2} cy={cy2} r={r * 0.82} fill="none" stroke="white" strokeWidth="3" opacity={0.45} />}
        <Line x1={cx2 - r*0.15} y1={cy2 - r*0.45} x2={cx2 + r*0.25} y2={cy2 + r*0.35} stroke="white" strokeWidth="5" opacity={0.09} strokeLinecap="round" />
      </Svg>
    )
  }

  if (shape === 'ovaal') {
    const rx = Math.round(Math.min(w, h) / 2)
    const ry = rx
    const og = { stroke: GLOW, strokeWidth: GLOW_W, opacity: 0.8, fill: 'none' as const }
    const od = { stroke: 'white', strokeWidth: '3', opacity: 0.5, strokeLinecap: 'round' as const }
    function ovaalIndirectGlow() {
      if (indirectPos === 'rondom') return <Rect x={x-4} y={y-4} width={w+8} height={h+8} rx={rx+4} ry={ry+4} {...og} />
      if (indirectPos === 'boven') return <Line x1={x} y1={y-3} x2={x+w} y2={y-3} {...og} />
      if (indirectPos === 'onder') return <Line x1={x} y1={y+h+3} x2={x+w} y2={y+h+3} {...og} />
      if (indirectPos === 'boven-beneden' || indirectPos === 'boven-onder') return <>{[y-3, y+h+3].map((ly, i) => <Line key={i} x1={x} y1={ly} x2={x+w} y2={ly} {...og} />)}</>
      if (indirectPos === 'links-rechts') return <>{[x-3, x+w+3].map((lx, i) => <Line key={i} x1={lx} y1={y} x2={lx} y2={y+h} {...og} />)}</>
      return <Rect x={x-4} y={y-4} width={w+8} height={h+8} rx={rx+4} ry={ry+4} {...og} />
    }
    function ovaalDirectIndicator() {
      const irx = Math.round(Math.min(w-10, h-8) / 2)
      if (directPos === 'rondom') return <Rect x={x+5} y={y+4} width={w-10} height={h-8} rx={irx} ry={irx} fill="none" stroke="white" strokeWidth="2.5" opacity={0.45} />
      if (directPos === 'boven') return <Line x1={x+6} y1={y+4} x2={x+w-6} y2={y+4} {...od} />
      if (directPos === 'onder') return <Line x1={x+6} y1={y+h-4} x2={x+w-6} y2={y+h-4} {...od} />
      if (directPos === 'boven-beneden' || directPos === 'boven-onder') return <>{[y+4, y+h-4].map((ly, i) => <Line key={i} x1={x+6} y1={ly} x2={x+w-6} y2={ly} {...od} />)}</>
      if (directPos === 'links-rechts') return <>{[x+4, x+w-4].map((lx, i) => <Line key={i} x1={lx} y1={y+6} x2={lx} y2={y+h-6} {...od} />)}</>
      return <Rect x={x+5} y={y+4} width={w-10} height={h-8} rx={rx} ry={ry} fill="none" stroke="white" strokeWidth="2.5" opacity={0.45} />
    }
    return (
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {hasIndirect && ovaalIndirectGlow()}
        <Rect x={x} y={y} width={w} height={h} rx={rx} ry={ry} fill={glass.fill} fillOpacity={glass.fillOpacity} />
        <Rect x={x} y={y} width={w} height={h} rx={rx} ry={ry} fill="none" stroke={glass.stroke} strokeWidth="1.2" />
        {hasDirect && ovaalDirectIndicator()}
        <Line x1={x + w*0.2} y1={y + h*0.15} x2={x + w*0.55} y2={y + h*0.7} stroke="white" strokeWidth="5" opacity={0.09} strokeLinecap="round" />
      </Svg>
    )
  }

  if (shape === 'elips') {
    // Echte ellips (1:2). Alleen indirecte verlichting rondom.
    const ecx = x + w / 2
    const ecy = y + h / 2
    const erx = w / 2
    const ery = h / 2
    return (
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {hasIndirect && <Ellipse cx={ecx} cy={ecy} rx={erx + 3} ry={ery + 3} fill="none" stroke={GLOW} strokeWidth={GLOW_W} opacity={0.8} />}
        <Ellipse cx={ecx} cy={ecy} rx={erx} ry={ery} fill={glass.fill} fillOpacity={glass.fillOpacity} />
        <Ellipse cx={ecx} cy={ecy} rx={erx} ry={ery} fill="none" stroke={glass.stroke} strokeWidth="1.2" />
        <Line x1={x + w*0.2} y1={y + h*0.15} x2={x + w*0.55} y2={y + h*0.7} stroke="white" strokeWidth="5" opacity={0.09} strokeLinecap="round" />
      </Svg>
    )
  }

  if (shape === 'arc') {
    const arcR = w / 2
    const mirrorPath = `M ${x},${y + arcR} A ${arcR},${arcR} 0 0 1 ${x + w},${y + arcR} L ${x + w},${y + h} L ${x},${y + h} Z`
    const glowPath = `M ${x-4},${y + arcR} A ${arcR+4},${arcR+4} 0 0 1 ${x + w+4},${y + arcR} L ${x + w+4},${y + h+4} L ${x-4},${y + h+4} Z`
    const innerPath = `M ${x+5},${y + arcR} A ${arcR-5},${arcR-5} 0 0 1 ${x + w-5},${y + arcR} L ${x + w-5},${y + h-5} L ${x+5},${y + h-5} Z`
    const ag = { stroke: GLOW, strokeWidth: GLOW_W, opacity: 0.8, fill: 'none' as const }
    const ad = { stroke: 'white', strokeWidth: '3', opacity: 0.5, strokeLinecap: 'round' as const }
    function arcIndirectGlow() {
      if (indirectPos === 'rondom') return <Path d={glowPath} fill="none" stroke={GLOW} strokeWidth={GLOW_W} opacity={0.7} />
      if (indirectPos === 'boven') return <Line x1={x} y1={y-3} x2={x+w} y2={y-3} {...ag} />
      if (indirectPos === 'onder') return <Line x1={x} y1={y+h+3} x2={x+w} y2={y+h+3} {...ag} />
      if (indirectPos === 'boven-beneden' || indirectPos === 'boven-onder') return <>{[y-3, y+h+3].map((ly, i) => <Line key={i} x1={x} y1={ly} x2={x+w} y2={ly} {...ag} />)}</>
      if (indirectPos === 'links-rechts') return <>{[x-3, x+w+3].map((lx, i) => <Line key={i} x1={lx} y1={y} x2={lx} y2={y+h} {...ag} />)}</>
      return <Path d={glowPath} fill="none" stroke={GLOW} strokeWidth={GLOW_W} opacity={0.7} />
    }
    function arcDirectIndicator() {
      if (directPos === 'rondom') return <Path d={innerPath} fill="none" stroke="white" strokeWidth="2.5" opacity={0.45} />
      if (directPos === 'boven') return <Line x1={x+6} y1={y+4} x2={x+w-6} y2={y+4} {...ad} />
      if (directPos === 'onder') return <Line x1={x+6} y1={y+h-4} x2={x+w-6} y2={y+h-4} {...ad} />
      if (directPos === 'boven-beneden' || directPos === 'boven-onder') return <>{[y+4, y+h-4].map((ly, i) => <Line key={i} x1={x+6} y1={ly} x2={x+w-6} y2={ly} {...ad} />)}</>
      if (directPos === 'links-rechts') return <>{[x+4, x+w-4].map((lx, i) => <Line key={i} x1={lx} y1={y+6} x2={lx} y2={y+h-6} {...ad} />)}</>
      return <Path d={innerPath} fill="none" stroke="white" strokeWidth="2.5" opacity={0.45} />
    }
    return (
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {hasIndirect && arcIndirectGlow()}
        <Path d={mirrorPath} fill={glass.fill} fillOpacity={glass.fillOpacity} />
        <Path d={mirrorPath} fill="none" stroke={glass.stroke} strokeWidth="1.2" />
        {hasDirect && arcDirectIndicator()}
        <Line x1={x + w*0.25} y1={y + arcR*0.25} x2={x + w*0.5} y2={y + h*0.6} stroke="white" strokeWidth="5" opacity={0.09} strokeLinecap="round" />
      </Svg>
    )
  }

  if (shape === 'rounded-rect') {
    const rx = Math.round(Math.min(w, h) * 0.18)
    const ry = rx
    return (
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {hasIndirect && indirectLightGlow(x, y, w, h, indirectPos)}
        <Rect x={x} y={y} width={w} height={h} rx={rx} ry={ry} fill={glass.fill} fillOpacity={glass.fillOpacity} />
        <Rect x={x} y={y} width={w} height={h} rx={rx} ry={ry} fill="none" stroke={glass.stroke} strokeWidth="1.2" />
        {hasDirect && directLightIndicator(x, y, w, h, directPos)}
        <Line x1={x+w*0.25} y1={y+h*0.1} x2={x+w*0.52} y2={y+h*0.58} stroke="white" strokeWidth="5" opacity={0.09} strokeLinecap="round" />
      </Svg>
    )
  }

  if (shape === 'organic') {
    const organicPath = "M73.5,134c-1.1,0-2.3,0-3.4-.2-.4,0-.8,0-1.3-.2-.8-.1-1.7-.3-2.5-.5h0c-4.1-.9-8.2-2.7-12.1-5.4-20.7-14.2-36.5-33.7-48.4-59.5C.8,57.1-1.1,45.2.6,34.7,2.5,22.6,8.9,12.9,19.1,6.8,28,1.4,45.4-.6,58.1.2c20.8.7,78.6,13,98.7,39.4,6.3,8.3,8.3,17.2,6,26.4v.4c-10.5,29.2-39.2,53.3-79,66-3.4,1.1-6.9,1.7-10.4,1.7Z" // echte productvorm (organic_vorm.svg)
    const scale = available / 200
    return (
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <G transform={`translate(${PAD + 18.15 * scale} ${PAD + 33 * scale}) scale(${scale})`}>
          {hasIndirect && <Path d={organicPath} fill="none" stroke={GLOW} strokeWidth={GLOW_W / scale} opacity={0.7} />}
          <Path d={organicPath} fill={glass.fill} fillOpacity={glass.fillOpacity} />
          <Path d={organicPath} fill="none" stroke={glass.stroke} strokeWidth={1.2 / scale} />
          {hasDirect && <Path d={organicPath} fill="none" stroke="white" strokeWidth={10 / scale} opacity={0.45} />}
          <Line x1={55} y1={55} x2={90} y2={120} stroke="white" strokeWidth={9 / scale} opacity={0.09} strokeLinecap="round" />
        </G>
      </Svg>
    )
  }

  if (shape === 'sol' || shape === 'luna') {
    const d = (opts.diameter as number) ?? 80
    const r = Math.min(available / 2, available * 0.45)
    const cx = SIZE / 2
    const cy = SIZE / 2
    const scale = r / (d / 2)

    const meubelH    = shape === 'sol' ? ((opts.solMeubelHoogte as number) ?? 35) : ((opts.lunaMeubelHoogte as number) ?? 35)
    const onderkantH = shape === 'sol' ? ((opts.solOnderkant as number) ?? 15)   : ((opts.lunaOnderkant as number) ?? 15)
    const lunaAfstand = shape === 'luna' ? ((opts.lunaAfstand as number) ?? 20) : 0
    const lunaMuurZijde = shape === 'luna' ? ((opts.lunaMuurZijde as string) ?? 'links') : 'links'
    const afstandL = lunaMuurZijde === 'links' ? lunaAfstand : 0
    const afstandR = lunaMuurZijde === 'rechts' ? lunaAfstand : 0

    const svgBottomCut = cy + r - onderkantH * scale
    const svgTopCut    = cy + r - (onderkantH + meubelH) * scale
    const svgLeftCut   = cx - r + afstandL * scale
    const svgRightCut  = cx + r - afstandR * scale

    const halfChordTop = Math.sqrt(Math.max(0, r * r - (svgTopCut - cy) * (svgTopCut - cy)))
    const lX = shape === 'luna' ? Math.max(svgLeftCut, cx - halfChordTop) : cx - halfChordTop
    const rX = shape === 'luna' ? Math.min(svgRightCut, cx + halfChordTop) : cx + halfChordTop

    const lTopY = (shape === 'luna' && svgLeftCut > cx - halfChordTop)
      ? cy - Math.sqrt(Math.max(0, r * r - (svgLeftCut - cx) * (svgLeftCut - cx))) : svgTopCut
    const rTopY = (shape === 'luna' && svgRightCut < cx + halfChordTop)
      ? cy - Math.sqrt(Math.max(0, r * r - (svgRightCut - cx) * (svgRightCut - cx))) : svgTopCut

    const solLargeArc = svgTopCut > cy ? 1 : 0
    const mainPath = shape === 'luna'
      ? `M ${svgLeftCut},${lTopY} A ${r},${r} 0 0 1 ${svgRightCut},${rTopY} L ${svgRightCut},${svgTopCut} L ${svgLeftCut},${svgTopCut} Z`
      : `M ${lX},${svgTopCut} A ${r},${r} 0 ${solLargeArc} 1 ${rX},${svgTopCut} Z`

    const hasExtraDeel = svgBottomCut < cy + r
    const halfChordBottom = hasExtraDeel
      ? Math.sqrt(Math.max(0, r * r - (svgBottomCut - cy) * (svgBottomCut - cy))) : 0
    const lXb = shape === 'luna' ? Math.max(svgLeftCut, cx - halfChordBottom) : cx - halfChordBottom
    const rXb = shape === 'luna' ? Math.min(svgRightCut, cx + halfChordBottom) : cx + halfChordBottom
    const extraLargeArc = svgBottomCut < cy ? 1 : 0
    const extraPath = hasExtraDeel
      ? `M ${lXb},${svgBottomCut} A ${r},${r} 0 ${extraLargeArc} 0 ${rXb},${svgBottomCut} Z` : ''

    const balkH = svgBottomCut - svgTopCut

    return (
      <Svg width={146} height={115} viewBox={`-6 -25 ${SIZE + 46} ${SIZE + 13}`}>
        {hasIndirect && (
          <Circle cx={cx} cy={cy} r={r + 4} fill="none" stroke={GLOW} strokeWidth={GLOW_W} opacity={0.7} />
        )}
        <Path d={mainPath} fill={glass.fill} fillOpacity={glass.fillOpacity} />
        <Path d={mainPath} fill="none" stroke={glass.stroke} strokeWidth="1.2" />
        {hasExtraDeel && (
          <Path d={extraPath} fill={glass.fill} fillOpacity={glass.fillOpacity * 0.5} />
        )}
        {hasExtraDeel && (
          <Path d={extraPath} fill="none" stroke={glass.stroke} strokeWidth="1" opacity={0.5} />
        )}
        {balkH > 0 && (
          <Path
            d={(() => {
              const bL = (shape === 'luna' && hasExtraDeel) ? Math.min(lX, lXb) : lX
              const bR = (shape === 'luna' && hasExtraDeel) ? Math.max(rX, rXb) : rX
              return `M ${bL},${svgTopCut} L ${bR},${svgTopCut} L ${bR},${svgBottomCut} L ${bL},${svgBottomCut} Z`
            })()}
            fill="#E8E4DF" fillOpacity={0.8} stroke="#B0ABA4" strokeWidth="0.7"
          />
        )}
        {shape === 'luna' && afstandL > 0 && (
          <Line x1={svgLeftCut} y1={cy - r} x2={svgLeftCut} y2={cy + r}
            stroke="#B0ABA4" strokeWidth="0.8" opacity={0.5} />
        )}
        {shape === 'luna' && afstandR > 0 && (
          <Line x1={svgRightCut} y1={cy - r} x2={svgRightCut} y2={cy + r}
            stroke="#B0ABA4" strokeWidth="0.8" opacity={0.5} />
        )}
        <Line x1={cx - r * 0.15} y1={cy - r * 0.45} x2={cx + r * 0.25} y2={cy + r * 0.35}
          stroke="white" strokeWidth="5" opacity={0.09} strokeLinecap="round" />

        {/* Maatlijnen — altijd in de PDF (overlay, wijzigt de vorm niet) */}
        {(() => {
          const mw = halfChordTop
          const leftW = shape === 'luna' ? Math.max(cx - r, svgLeftCut) : cx - r
          const rightW = shape === 'luna' ? Math.min(cx + r, svgRightCut) : cx + r
          const leftM = shape === 'luna' ? Math.max(cx - mw, svgLeftCut) : cx - mw
          const rightM = shape === 'luna' ? Math.min(cx + mw, svgRightCut) : cx + mw
          const topY = cy - r
          const breedteCm = shape === 'luna' ? Math.round((rightW - leftW) / scale) : d
          const meubelBreedteCm = Math.round((rightM - leftM) / scale)
          const hoogteCm = Math.round((svgTopCut - topY) / scale)
          const cW = (leftW + rightW) / 2
          const cM = (leftM + rightM) / 2
          const ext = { stroke: '#c9c6bf', strokeWidth: 0.5, strokeDasharray: '2 1.5' }
          const dim = { stroke: '#c9c6bf', strokeWidth: 0.5, strokeDasharray: '2 1.5' }
          const rightDim = SIZE + 12
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const T = (tx: number, ty: number, t: string) => (<Text {...{ x: tx, y: ty, textAnchor: 'middle', fontSize: 6.5, fill: '#222222', fontFamily: 'Helvetica-Bold' } as any}>{t}</Text>)
          return (
            <>
              {/* Breedte / diameter (boven) */}
              <Line x1={leftW} y1={cy} x2={leftW} y2={-19} {...ext} />
              <Line x1={rightW} y1={cy} x2={rightW} y2={-19} {...ext} />
              <Line x1={leftW} y1={-17} x2={rightW} y2={-17} {...dim} />
              <Rect x={cW - 14} y={-23.5} width={28} height={9} fill="#FFFFFF" />
              {T(cW, -17, shape === 'luna' ? `${breedteCm} cm` : `⌀ ${breedteCm} cm`)}
              {/* Breedte op meubel */}
              <Line x1={leftM} y1={svgTopCut} x2={leftM} y2={-6} {...ext} />
              <Line x1={rightM} y1={svgTopCut} x2={rightM} y2={-6} {...ext} />
              <Line x1={leftM} y1={-4.5} x2={rightM} y2={-4.5} {...dim} />
              <Rect x={cM - 11} y={-11} width={22} height={9} fill="#FFFFFF" />
              {T(cM, -4.5, `${meubelBreedteCm} cm`)}
              {/* Hoogte (rechts) */}
              <Line x1={cx} y1={topY} x2={rightDim + 2} y2={topY} {...ext} />
              <Line x1={rightM} y1={svgTopCut} x2={rightDim + 2} y2={svgTopCut} {...ext} />
              <Line x1={rightDim} y1={topY} x2={rightDim} y2={svgTopCut} {...dim} />
              <Rect x={rightDim + 3} y={(topY + svgTopCut) / 2 - 4.5} width={24} height={9} fill="#FFFFFF" />
              {T(rightDim + 15, (topY + svgTopCut) / 2 + 1.7, `${hoogteCm} cm`)}
            </>
          )
        })()}
      </Svg>
    )
  }

  // op-aanvraag
  if (shape === 'op-aanvraag') {
    const cx = SIZE / 2
    const cy = (y + y + h) / 2
    return (
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Rect x={x} y={y} width={w} height={h} rx={2} fill="#F0F0F0" fillOpacity={0.6}
          stroke="#AAAAAA" strokeWidth="1.2" strokeDasharray="4 3" />
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Text {...{ x: cx, y: cy + 7, textAnchor: 'middle', fontSize: 22, fill: '#AAAAAA', fontFamily: 'Helvetica-Bold' } as any}>?</Text>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Text {...{ x: cx, y: y + h + 10, textAnchor: 'middle', fontSize: 6, fill: '#AAAAAA', fontFamily: 'Helvetica' } as any}>Op aanvraag</Text>
      </Svg>
    )
  }

  // rechthoek
  return (
    <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      {hasIndirect && indirectLightGlow(x, y, w, h, indirectPos)}
      <Rect x={x} y={y} width={w} height={h} rx={2} fill={glass.fill} fillOpacity={glass.fillOpacity} />
      <Rect x={x} y={y} width={w} height={h} rx={2} fill="none" stroke={glass.stroke} strokeWidth="1.2" />
      {hasDirect && directLightIndicator(x, y, w, h, directPos)}
      <Line x1={x+w*0.25} y1={y+h*0.1} x2={x+w*0.52} y2={y+h*0.58} stroke="white" strokeWidth="5" opacity={0.09} strokeLinecap="round" />
    </Svg>
  )
}
