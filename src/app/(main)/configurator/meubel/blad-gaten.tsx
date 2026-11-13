import type { SVGProps } from 'react'
import type { TekenGat } from '@/lib/meubel-tekening'

// Eén gat of waskom in het bovenaanzicht, getekend in de eenheden van de omringende
// tekening. Gedeeld door de tekening in de configurator en het tekenvenster.

const KOM_VLAK = '#EDEAE3'

export function GatVorm({ gat, x0, y0, schaal, lijn, dun = 1, geselecteerd = false, ...rest }: {
  gat: TekenGat
  /** Linkerbovenhoek van het blad (achterkant links) en tekeneenheden per mm */
  x0: number
  y0: number
  schaal: number
  lijn: string
  /** Lijndikte in tekeneenheden */
  dun?: number
  geselecteerd?: boolean
} & Omit<SVGProps<SVGGElement>, 'x' | 'y'>) {
  const cx = x0 + gat.x * schaal, cy = y0 + gat.y * schaal
  const accent = geselecteerd ? 'var(--lx-cta)' : lijn
  if (gat.soort === 'kom') {
    const b = (gat.b ?? 0) * schaal, h = (gat.h ?? 0) * schaal
    return (
      <g {...rest}>
        {gat.ovaal
          ? <ellipse cx={cx} cy={cy} rx={b / 2} ry={h / 2} fill={KOM_VLAK} stroke={accent} strokeWidth={geselecteerd ? dun * 2 : dun} />
          : <rect x={cx - b / 2} y={cy - h / 2} width={b} height={h} rx={(gat.radius ?? 0) * schaal} fill={KOM_VLAK} stroke={accent} strokeWidth={geselecteerd ? dun * 2 : dun} />}
        <circle cx={cx} cy={cy} r={((gat.afvoer ?? 0) / 2) * schaal} fill="#fff" stroke={lijn} strokeWidth={dun * 0.8} />
      </g>
    )
  }
  const r = (gat.d / 2) * schaal
  // Kruis door het hart, zoals op een werktekening
  const k = r + 3 * dun
  return (
    <g {...rest}>
      <circle cx={cx} cy={cy} r={r} fill="#fff" stroke={accent} strokeWidth={geselecteerd ? dun * 2 : dun} />
      <line x1={cx - k} y1={cy} x2={cx + k} y2={cy} stroke={accent} strokeWidth={dun * 0.6} />
      <line x1={cx} y1={cy - k} x2={cx} y2={cy + k} stroke={accent} strokeWidth={dun * 0.6} />
    </g>
  )
}
