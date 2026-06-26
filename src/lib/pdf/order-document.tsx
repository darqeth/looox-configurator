import React from 'react'
import {
  Document,
  Page,
  View,
  Text,
  Image,
  Svg,
  Path,
  Polygon,
  Rect,
  Circle,
  Line,
  G,
  StyleSheet,
} from '@react-pdf/renderer'

function formatAddress(str: string | null | undefined): string {
  if (!str) return ''
  const parts = str.split('\t')
  if (parts.length === 5) {
    const [straat, huisnummer, woonplaats, provincie, land] = parts
    const line1 = [straat, huisnummer].filter(Boolean).join(' ')
    const landLabel = land === 'BE' ? 'België' : land === 'NL' ? 'Nederland' : land
    return [line1, woonplaats, provincie, landLabel].filter(Boolean).join(', ')
  }
  return str
}

// LoooX logo als SVG (gebaseerd op /public/logo-looox-grey.svg)
function LoooXLogo({ width = 80, color = '#3D6B4F' }: { width?: number; color?: string }) {
  const height = Math.round(80.89 * (width / 197.23))
  return (
    <Svg viewBox="0 0 197.23 80.89" style={{ width, height }}>
      <Polygon fill={color} points="27,32.38 27,49.07 43.41,49.07 43.41,45.92 30.9,45.92 30.9,32.38" />
      <Path fill={color} d="M52.97,45.92h12.82V35.34H52.97V45.92z M49.06,36.33c0-1.55,0.29-2.6,0.88-3.14c0.58-0.54,1.67-0.81,3.28-0.81h12.32c1.6,0,2.69,0.27,3.27,0.81c0.58,0.54,0.88,1.58,0.88,3.14v8.79c0,1.55-0.29,2.6-0.88,3.14c-0.58,0.54-1.67,0.81-3.27,0.81H53.22c-1.6,0-2.7-0.27-3.28-0.81c-0.59-0.54-0.88-1.59-0.88-3.14V36.33z" />
      <Path fill={color} d="M81.7,45.92h12.82V35.34H81.7V45.92z M77.8,36.33c0-1.55,0.29-2.6,0.88-3.14c0.58-0.54,1.68-0.81,3.27-0.81h12.32c1.6,0,2.69,0.27,3.27,0.81c0.58,0.54,0.88,1.58,0.88,3.14v8.79c0,1.55-0.29,2.6-0.88,3.14c-0.58,0.54-1.67,0.81-3.27,0.81H81.95c-1.6,0-2.69-0.27-3.27-0.81c-0.59-0.54-0.88-1.59-0.88-3.14V36.33z" />
      <Path fill={color} d="M110.43,45.92h12.82V35.34h-12.82V45.92z M106.53,36.33c0-1.55,0.29-2.6,0.88-3.14c0.59-0.54,1.67-0.81,3.27-0.81h12.32c1.6,0,2.69,0.27,3.27,0.81c0.58,0.54,0.88,1.58,0.88,3.14v8.79c0,1.55-0.29,2.6-0.88,3.14c-0.58,0.54-1.68,0.81-3.27,0.81h-12.32c-1.6,0-2.69-0.27-3.27-0.81c-0.58-0.54-0.88-1.59-0.88-3.14V36.33z" />
      <Path fill={color} d="M166.49,18.16c-1.1,1.1-11.66,12.54-11.66,12.54c-3.85,4.01-6.49,6.14-8.38,6.14c-0.04,0-0.08,0-0.12,0c-1.82-0.09-2.9-1.24-4.77-4.51c-2.3-4.02-3.83-7.16-4.98-9.1c-2.04-3.2-3.63-4.8-5.35-4.8c-1.16,0-2.01,0.32-2.46,1.14c-0.63,1.16-1.32,3.61,2.39,7.59c3.15,3.39,4.96,5.69,5.75,6.85c1.99,2.83,3.38,4.41,2.67,7.16c-0.49,1.88-6.97,9.77-9.26,11.74c-1.36,1.36-5.5,3.79-8.63,6.71c-3.01,2.81-0.96,5.58,1.51,5.58c4.17,0,6.26-3.71,6.77-4.67c1.82-3.45,5.01-8.16,6.43-9.88c2.5-3.05,4.75-4.06,6.18-4.06c2.09,0,5.3,0.66,6.39,6.83c1.28,5.87-0.43,10,1.55,11.98c1.06,1.06,2.27,1.49,3.45,1.49c2.83,0,5.49-2.49,5.49-4.74c0-3.98-3.07-5.76-6.37-10.07c-3.65-4.75-4.02-7.4-3.83-9.74c0.14-1.73,1.3-3.94,5.04-6.76c4.66-3.53,7.33-5.34,9.75-7.4c1.64-1.39,2.85-2.79,4.37-4.93c1.67-2.35,2.57-5.37,1.17-6.14c-0.22-0.13-0.46-0.18-0.71-0.18C167.96,16.93,166.98,17.68,166.49,18.16" />
    </Svg>
  )
}
import {
  ConfigOptions,
  formatShape,
  formatDimensions,
  formatGlas,
  formatLight,
  formatExtras,
  formatDate,
  formatPrice,
} from './helpers'

// ─── PDF Mirror Preview ───────────────────────────────────────────────────────

const GLASS_FILL: Record<string, { fill: string; fillOpacity: number; stroke: string }> = {
  'helder':      { fill: '#C8D4DC', fillOpacity: 0.55, stroke: '#A8B4BC' },
  'smoke-grijs': { fill: '#5A6068', fillOpacity: 0.80, stroke: '#464C54' },
  'smoke-zwart': { fill: '#5A6068', fillOpacity: 0.80, stroke: '#464C54' },
  'smoke-brons': { fill: '#7A5C2A', fillOpacity: 0.82, stroke: '#604820' },
}

function PdfMirrorPreview({ opts, width: configWidth, height: configHeight }: {
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
  const indirectPos = (opts.indirectLight as { position?: string } | null)?.position ?? 'geen'
  const hasDirect   = (opts.directLight as { position?: string } | null)?.position !== 'geen' && (opts.directLight as { position?: string } | null)?.position != null
  const hasIndirect = indirectPos !== 'geen'
  const GLOW = '#FEF3C7'
  const GLOW_W = 5

  const w0 = configWidth ?? 80
  const h0 = configHeight ?? 60
  const ratio = Math.min(available / w0, available / h0)
  const w = Math.round(w0 * ratio)
  const h = Math.round(h0 * ratio)
  const x = (SIZE - w) / 2
  const y = (SIZE - h) / 2

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
    return (
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {hasIndirect && <Rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} rx={rx + 4} ry={ry + 4} fill="none" stroke={GLOW} strokeWidth={GLOW_W} opacity={0.7} />}
        <Rect x={x} y={y} width={w} height={h} rx={rx} ry={ry} fill={glass.fill} fillOpacity={glass.fillOpacity} />
        <Rect x={x} y={y} width={w} height={h} rx={rx} ry={ry} fill="none" stroke={glass.stroke} strokeWidth="1.2" />
        {hasDirect && <Rect x={x + 6} y={y + 4} width={w - 12} height={h - 8} rx={Math.max(2, rx - 5)} ry={Math.max(2, ry - 5)} fill="none" stroke="white" strokeWidth="2.5" opacity={0.45} />}
        <Line x1={x + w*0.2} y1={y + h*0.15} x2={x + w*0.55} y2={y + h*0.7} stroke="white" strokeWidth="5" opacity={0.09} strokeLinecap="round" />
      </Svg>
    )
  }

  if (shape === 'arc') {
    const arcR = w / 2
    const mirrorPath = `M ${x},${y + arcR} A ${arcR},${arcR} 0 0 1 ${x + w},${y + arcR} L ${x + w},${y + h} L ${x},${y + h} Z`
    const glowPath   = `M ${x-4},${y + arcR} A ${arcR+4},${arcR+4} 0 0 1 ${x + w+4},${y + arcR} L ${x + w+4},${y + h+4} L ${x-4},${y + h+4} Z`
    const innerPath  = `M ${x+5},${y + arcR} A ${arcR-5},${arcR-5} 0 0 1 ${x + w-5},${y + arcR} L ${x + w-5},${y + h-5} L ${x+5},${y + h-5} Z`
    return (
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {hasIndirect && <Path d={glowPath} fill="none" stroke={GLOW} strokeWidth={GLOW_W} opacity={0.7} />}
        <Path d={mirrorPath} fill={glass.fill} fillOpacity={glass.fillOpacity} />
        <Path d={mirrorPath} fill="none" stroke={glass.stroke} strokeWidth="1.2" />
        {hasDirect && <Path d={innerPath} fill="none" stroke="white" strokeWidth="2.5" opacity={0.45} />}
        <Line x1={x + w*0.25} y1={y + arcR*0.25} x2={x + w*0.5} y2={y + h*0.6} stroke="white" strokeWidth="5" opacity={0.09} strokeLinecap="round" />
      </Svg>
    )
  }

  if (shape === 'rounded-rect') {
    const rx = Math.round(Math.min(w, h) * 0.18)
    const ry = rx
    return (
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {hasIndirect && <Rect x={x-4} y={y-4} width={w+8} height={h+8} rx={rx+4} ry={ry+4} fill="none" stroke={GLOW} strokeWidth={GLOW_W} opacity={0.7} />}
        <Rect x={x} y={y} width={w} height={h} rx={rx} ry={ry} fill={glass.fill} fillOpacity={glass.fillOpacity} />
        <Rect x={x} y={y} width={w} height={h} rx={rx} ry={ry} fill="none" stroke={glass.stroke} strokeWidth="1.2" />
        {hasDirect && <Rect x={x+5} y={y+4} width={w-10} height={h-8} rx={Math.max(2, rx-4)} ry={Math.max(2, ry-4)} fill="none" stroke="white" strokeWidth="2.5" opacity={0.45} />}
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
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
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
      {hasIndirect && <Rect x={x-4} y={y-4} width={w+8} height={h+8} rx={2} fill="none" stroke={GLOW} strokeWidth={GLOW_W} opacity={0.7} />}
      <Rect x={x} y={y} width={w} height={h} rx={2} fill={glass.fill} fillOpacity={glass.fillOpacity} />
      <Rect x={x} y={y} width={w} height={h} rx={2} fill="none" stroke={glass.stroke} strokeWidth="1.2" />
      {hasDirect && <Rect x={x+5} y={y+4} width={w-10} height={h-8} rx={1} fill="none" stroke="white" strokeWidth="2.5" opacity={0.45} />}
      <Line x1={x+w*0.25} y1={y+h*0.1} x2={x+w*0.52} y2={y+h*0.58} stroke="white" strokeWidth="5" opacity={0.09} strokeLinecap="round" />
    </Svg>
  )
}

const BRAND = '#3D6B4F'
const BRAND_LIGHT = '#EAF0EC'
const GRAY = '#6B7280'
const DARK = '#111827'
const DIVIDER = '#E5E7EB'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: DARK,
    padding: 40,
    backgroundColor: '#FFFFFF',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: BRAND,
  },
  logo: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: BRAND,
    letterSpacing: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  docTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    marginBottom: 4,
  },
  headerMeta: {
    fontSize: 8,
    color: GRAY,
    marginTop: 2,
  },

  // Section
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: BRAND,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sectionBox: {
    backgroundColor: BRAND_LIGHT,
    borderRadius: 4,
    padding: 10,
  },

  // Two columns
  row2: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  col: {
    flex: 1,
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    width: 110,
    color: GRAY,
    fontSize: 8.5,
  },
  infoValue: {
    flex: 1,
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
  },

  // Specs table
  table: {
    borderWidth: 1,
    borderColor: DIVIDER,
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tableRowLast: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tableLabel: {
    width: 130,
    color: GRAY,
    fontSize: 8.5,
  },
  tableValue: {
    flex: 1,
    fontSize: 8.5,
  },

  // Pricing box
  pricingBox: {
    backgroundColor: BRAND_LIGHT,
    borderRadius: 4,
    padding: 12,
    marginTop: 4,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pricingLabel: {
    color: GRAY,
    fontSize: 8.5,
  },
  pricingValue: {
    fontSize: 8.5,
  },
  pricingDivider: {
    borderTopWidth: 1,
    borderTopColor: BRAND,
    marginVertical: 6,
  },
  totalLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: DARK,
  },
  totalValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    color: BRAND,
  },
  vatNote: {
    fontSize: 7.5,
    color: GRAY,
    marginTop: 3,
    textAlign: 'right',
  },

  // Notes
  notesBox: {
    borderWidth: 1,
    borderColor: DIVIDER,
    borderRadius: 4,
    padding: 10,
    marginTop: 4,
  },
  notesText: {
    fontSize: 8.5,
    color: DARK,
    lineHeight: 1.5,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7.5,
    color: GRAY,
  },
})

export type OrderDocumentProps = {
  orderNumber: string
  orderDate: string
  articleNumber?: string | null
  status: string
  dealer: {
    name: string | null
    company: string | null
    email: string
    phone?: string | null
    address?: string | null
    shippingAddress?: string | null
  }
  config: {
    name: string | null
    width: number | null
    height: number | null
    options: ConfigOptions
  }
  unitPrice: number
  korting: number
  quantity: number
  notes?: string | null
  attachmentUrl?: string | null
  staffelKortingPct?: number
}

const STATUS_NL: Record<string, string> = {
  pending: 'In behandeling',
  confirmed: 'Bevestigd',
  shipped: 'Verzonden',
  delivered: 'Geleverd',
  cancelled: 'Geannuleerd',
}

export default function OrderDocument({
  orderNumber, orderDate, articleNumber, status,
  dealer, config, unitPrice, korting, quantity, notes, attachmentUrl, staffelKortingPct,
}: OrderDocumentProps) {
  const opts = config.options
  const nettoUnitPrice = Math.round(unitPrice * (1 - korting / 100))
  const staffelAmountPerStuk = staffelKortingPct && staffelKortingPct > 0
    ? Math.round(nettoUnitPrice * staffelKortingPct)
    : 0
  const finalNettoUnitPrice = nettoUnitPrice - staffelAmountPerStuk
  const nettoSubtotal = finalNettoUnitPrice * quantity
  const discountAmount = (opts.discountAmount as number | null) ?? 0
  const nettoTotal = nettoSubtotal - discountAmount

  return (
    <Document
      title={`Orderbevestiging ${orderNumber}`}
      author="LoooX"
      creator="LoooX Configurator"
    >
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <LoooXLogo width={110} />
            <Text style={[styles.headerMeta, { marginTop: 4 }]}>Spiegel op maat</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>Orderbevestiging</Text>
            <Text style={styles.headerMeta}>Ordernummer: {orderNumber}</Text>
            <Text style={styles.headerMeta}>Datum: {formatDate(orderDate)}</Text>
            <Text style={styles.headerMeta}>Status: {STATUS_NL[status] ?? status}</Text>
          </View>
        </View>

        {/* Dealer + Config info naast elkaar */}
        <View style={styles.row2}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Dealer</Text>
            <View style={styles.sectionBox}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Bedrijf</Text>
                <Text style={styles.infoValue}>{dealer.company ?? '—'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Naam</Text>
                <Text style={styles.infoValue}>{dealer.name ?? '—'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>E-mail</Text>
                <Text style={styles.infoValue}>{dealer.email}</Text>
              </View>
              {dealer.phone && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Telefoon</Text>
                  <Text style={styles.infoValue}>{dealer.phone}</Text>
                </View>
              )}
              {dealer.address && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Adres</Text>
                  <Text style={styles.infoValue}>{formatAddress(dealer.address)}</Text>
                </View>
              )}
              {dealer.shippingAddress && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Afleveradres</Text>
                  <Text style={styles.infoValue}>{formatAddress(dealer.shippingAddress)}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Project</Text>
            <View style={styles.sectionBox}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Projectnaam</Text>
                <Text style={styles.infoValue}>{config.name ?? '—'}</Text>
              </View>
              {opts.reference && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Referentie</Text>
                  <Text style={styles.infoValue}>{opts.reference}</Text>
                </View>
              )}
              {articleNumber && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Artikelnummer</Text>
                  <Text style={styles.infoValue}>{articleNumber}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Aantal</Text>
                <Text style={styles.infoValue}>{quantity}×</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Spiegel preview */}
        <View style={[styles.section, { alignItems: 'center' }]}>
          <PdfMirrorPreview opts={config.options} width={config.width} height={config.height} />
        </View>

        {/* Specificaties */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Specificatie</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Vorm</Text>
              <Text style={styles.tableValue}>{formatShape(opts.shape)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Afmeting</Text>
              <Text style={styles.tableValue}>
                {formatDimensions(opts.shape, config.width, config.height, opts)}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Glas</Text>
              <Text style={styles.tableValue}>{formatGlas(opts.glasKleur)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Directe verlichting</Text>
              <Text style={styles.tableValue}>{formatLight(opts.directLight)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Indirecte verlichting</Text>
              <Text style={styles.tableValue}>{formatLight(opts.indirectLight)}</Text>
            </View>
            <View style={styles.tableRowLast}>
              <Text style={styles.tableLabel}>Extra opties</Text>
              <Text style={styles.tableValue}>
                {formatExtras(opts.extras, opts.optionSubChoices)}
              </Text>
            </View>
          </View>
        </View>

        {/* Prijs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prijsoverzicht (excl. BTW)</Text>
          <View style={styles.pricingBox}>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Bruto ex. BTW</Text>
              <Text style={[styles.pricingValue, { color: GRAY }]}>{formatPrice(unitPrice)}</Text>
            </View>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Dealer korting ({korting}%)</Text>
              <Text style={[styles.pricingValue, { color: GRAY }]}>-{formatPrice(Math.round(unitPrice * korting / 100))}</Text>
            </View>
            {staffelAmountPerStuk > 0 && (
              <View style={styles.pricingRow}>
                <Text style={styles.pricingLabel}>
                  Staffelkorting ({((staffelKortingPct ?? 0) * 100).toFixed(0)}%)
                </Text>
                <Text style={[styles.pricingValue, { color: GRAY }]}>-{formatPrice(staffelAmountPerStuk)}</Text>
              </View>
            )}
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Netto ex. BTW</Text>
              <Text style={styles.pricingValue}>{formatPrice(finalNettoUnitPrice)}</Text>
            </View>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Aantal</Text>
              <Text style={styles.pricingValue}>{quantity}×</Text>
            </View>
            {opts.discountType && opts.discountAmount ? (
              <>
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingLabel}>Subtotaal</Text>
                  <Text style={[styles.pricingValue, { color: GRAY }]}>{formatPrice(nettoSubtotal)}</Text>
                </View>
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingLabel}>
                    Kortingscode ({opts.discountType === 'pct' ? `${opts.discountValue}%` : `${formatPrice(opts.discountValue ?? 0)} eenmalig`})
                  </Text>
                  <Text style={[styles.pricingValue, { color: BRAND }]}>
                    -{formatPrice(discountAmount)}
                  </Text>
                </View>
              </>
            ) : null}
            <View style={styles.pricingDivider} />
            <View style={styles.pricingRow}>
              <Text style={styles.totalLabel}>Totaal</Text>
              <Text style={styles.totalValue}>{formatPrice(nettoTotal)}</Text>
            </View>
            <Text style={styles.vatNote}>Alle prijzen excl. BTW</Text>
          </View>
        </View>

        {/* Bijzonderheden */}
        {(notes || opts.description) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bijzonderheden</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{notes ?? opts.description}</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>LoooX - Spiegel op maat - info@looox.nl</Text>
          <Text style={styles.footerText}>{orderNumber} - {formatDate(orderDate)}</Text>
        </View>

      </Page>

      {/* Bijlage: maattekening schuine zijden */}
      {attachmentUrl && (
        <Page size="A4" style={styles.page}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <LoooXLogo width={90} />
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: DARK }}>Bijlage - Maattekening</Text>
              <Text style={{ fontSize: 8, color: GRAY, marginTop: 2 }}>{orderNumber} - {config.name ?? ''}</Text>
            </View>
          </View>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image
            src={attachmentUrl}
            style={{ width: 515, height: 690, objectFit: 'contain' }}
          />
          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>LoooX - Spiegel op maat - info@looox.nl</Text>
            <Text style={styles.footerText}>{orderNumber} - Bijlage maattekening</Text>
          </View>
        </Page>
      )}

    </Document>
  )
}
