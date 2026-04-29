'use client'

import { memo, useMemo } from 'react'
import {
  Glasdikte,
  calcBasisprijs,
  calcStuksprijs,
  getStaffelKorting,
  GLASDIKTE_PRIJS_M2,
  POLIJSTEN_PER_M,
  OPHANGING_KLEIN,
  OPHANGING_GROOT,
  VERPAKKING_PER_STUK,
} from '@/lib/projectspiegel-config'

const CANVAS = 220
const PAD = 28

const MirrorPreview = memo(function MirrorPreview({
  lengte,
  hoogte,
}: {
  lengte: number
  hoogte: number
}) {
  const available = CANVAS - PAD * 2
  const ratio = Math.min(available / lengte, available / hoogte)
  const w = Math.round(lengte * ratio)
  const h = Math.round(hoogte * ratio)
  const x = (CANVAS - w) / 2
  const y = (CANVAS - h) / 2

  return (
    <svg width={CANVAS} height={CANVAS} viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
      {/* Glasplaat */}
      <rect x={x} y={y} width={w} height={h} rx="2" fill="#C8D4DC" fillOpacity="0.40" />
      <rect x={x} y={y} width={w} height={h} rx="2" fill="none" stroke="#A8B4BC" strokeWidth="1.5" />
      {/* Glans */}
      <line
        x1={x + w * 0.25} y1={y + h * 0.1}
        x2={x + w * 0.52} y2={y + h * 0.58}
        stroke="white" strokeWidth="9" opacity="0.09" strokeLinecap="round"
      />
      <line
        x1={x + w * 0.5} y1={y + h * 0.05}
        x2={x + w * 0.65} y2={y + h * 0.42}
        stroke="white" strokeWidth="4" opacity="0.07" strokeLinecap="round"
      />
      {/* Afmeting label */}
      <text
        x={CANVAS / 2} y={CANVAS - 6}
        textAnchor="middle"
        fill="var(--lx-text-secondary)"
        fontSize="10"
        fontWeight="500"
      >
        {lengte} × {hoogte} cm
      </text>
    </svg>
  )
})

interface PreviewPanelProps {
  lengte: number
  hoogte: number
  glasdikte: Glasdikte
  ophanging: boolean
  verpakkingPerStuk: boolean
  quantity: number
}

export default function PreviewPanel({
  lengte, hoogte, glasdikte, ophanging, verpakkingPerStuk, quantity,
}: PreviewPanelProps) {
  const opp = (lengte / 100) * (hoogte / 100)
  const omtrek = 2 * ((lengte + hoogte) / 100)

  const glasKosten = opp * GLASDIKTE_PRIJS_M2[glasdikte]
  const polijstKosten = omtrek * POLIJSTEN_PER_M
  const ophangKosten = ophanging ? (opp <= 0.8 ? OPHANGING_KLEIN : OPHANGING_GROOT) : 0
  const verpakkingKosten = verpakkingPerStuk ? VERPAKKING_PER_STUK : 0

  const basisprijs = useMemo(() => calcBasisprijs({
    lengte, hoogte, glasdikte, ophanging, verpakkingPerStuk,
  }), [lengte, hoogte, glasdikte, ophanging, verpakkingPerStuk])

  const korting = getStaffelKorting(quantity)
  const stuksprijs = calcStuksprijs(basisprijs, quantity)

  const fmt = (n: number) =>
    n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="sticky top-6 space-y-4">
      {/* Preview kaart */}
      <div className="bg-white rounded-2xl shadow-sm border border-black/8 p-5 flex flex-col items-center">
        <MirrorPreview lengte={lengte} hoogte={hoogte} />
      </div>

      {/* Prijs kaart */}
      <div className="bg-white rounded-2xl shadow-sm border border-black/8 p-5 space-y-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-lx-text-secondary mb-1">
            Prijs per stuk
            {korting > 0 && (
              <span className="ml-2 text-lx-cta normal-case font-semibold">
                (−{(korting * 100).toFixed(1)}%)
              </span>
            )}
          </p>
          <span className="text-[28px] font-bold text-lx-text-primary">
            €{fmt(stuksprijs)}
          </span>
          <p className="text-[11px] text-lx-text-secondary mt-0.5">Netto ex. BTW</p>
        </div>

        <div className="space-y-1.5 border-t border-lx-divider pt-3">
          <div className="flex justify-between gap-2 text-[12px]">
            <span className="text-lx-text-secondary">
              Glas {glasdikte}mm · {opp.toFixed(2)} m²
            </span>
            <span className="text-lx-text-primary font-semibold">€{fmt(glasKosten)}</span>
          </div>
          <div className="flex justify-between gap-2 text-[12px]">
            <span className="text-lx-text-secondary">
              Polijsten · {omtrek.toFixed(2)} m
            </span>
            <span className="text-lx-text-primary font-semibold">€{fmt(polijstKosten)}</span>
          </div>
          {ophanging && (
            <div className="flex justify-between gap-2 text-[12px]">
              <span className="text-lx-text-secondary">
                Ophanging ({opp <= 0.8 ? '≤0,8' : '>0,8'} m²)
              </span>
              <span className="text-lx-text-primary font-semibold">€{fmt(ophangKosten)}</span>
            </div>
          )}
          {verpakkingPerStuk && (
            <div className="flex justify-between gap-2 text-[12px]">
              <span className="text-lx-text-secondary">Verpakking per stuk</span>
              <span className="text-lx-text-primary font-semibold">€{fmt(verpakkingKosten)}</span>
            </div>
          )}
          <div className="flex justify-between gap-2 text-[13px] font-bold pt-1.5 border-t border-lx-divider mt-1.5">
            <span className="text-lx-text-secondary">Basisprijs</span>
            <span className="text-lx-text-primary">€{fmt(basisprijs)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
