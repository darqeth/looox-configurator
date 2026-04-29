'use client'

import { useCallback } from 'react'
import {
  Glasdikte,
  calcBasisprijs,
  calcStuksprijs,
  calcTotaal,
  getStaffelKorting,
  getStaffelTip,
  STAFFEL_KORTINGEN,
  VERPAKKING_DREMPEL,
  VERPAKKING_PER_STUK,
} from '@/lib/projectspiegel-config'

interface StepSamenvattingProps {
  lengte: number
  hoogte: number
  glasdikte: Glasdikte
  ophanging: boolean
  voormonteren: boolean
  verpakkingPerStuk: boolean
  quantity: number
  projectName: string
  saving: boolean
  onVerpakkingChange: (v: boolean) => void
  onQuantityChange: (v: number) => void
  onProjectNameChange: (v: string) => void
  onGoToStep: (step: number) => void
  onSave: () => void
}

function Row({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-lx-divider last:border-0">
      <span className="text-[12.5px] text-lx-text-secondary font-medium flex-shrink-0 w-32">{label}</span>
      <span className="text-[13px] text-lx-text-primary font-medium flex-1">{value}</span>
      <button onClick={onEdit} className="text-[12px] text-lx-cta font-semibold hover:underline flex-shrink-0">
        Wijzigen
      </button>
    </div>
  )
}

export default function StepSamenvatting({
  lengte, hoogte, glasdikte, ophanging, voormonteren,
  verpakkingPerStuk, quantity, projectName, saving,
  onVerpakkingChange, onQuantityChange, onProjectNameChange,
  onGoToStep, onSave,
}: StepSamenvattingProps) {
  const basisprijs = calcBasisprijs({ lengte, hoogte, glasdikte, ophanging, verpakkingPerStuk })
  const stuksprijs = calcStuksprijs(basisprijs, quantity)
  const totaal     = calcTotaal(basisprijs, quantity)
  const korting    = getStaffelKorting(quantity)
  const tip        = getStaffelTip(basisprijs, quantity)

  const showVerpakkingToggle = quantity >= VERPAKKING_DREMPEL

  const stepQty = useCallback((delta: number) => {
    onQuantityChange(Math.max(1, quantity + delta))
  }, [quantity, onQuantityChange])

  return (
    <div className="space-y-5">
      {/* Configuratie overzicht */}
      <div className="bg-lx-panel-bg rounded-2xl p-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-lx-text-secondary mb-2">Configuratie</p>
        <Row
          label="Afmeting"
          value={`${lengte} × ${hoogte} cm · ${glasdikte} mm`}
          onEdit={() => onGoToStep(0)}
        />
        <Row
          label="Ophanging"
          value={ophanging ? (voormonteren ? 'Ja, voorgemonteerd' : 'Ja') : 'Nee'}
          onEdit={() => onGoToStep(1)}
        />
      </div>

      {/* Staffelprijzen tabel */}
      <div className="bg-lx-panel-bg rounded-2xl p-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-lx-text-secondary mb-3">Staffelprijzen (netto ex. BTW)</p>
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-lx-text-secondary">
              <th className="text-left pb-2 font-medium">Aantal</th>
              <th className="text-right pb-2 font-medium">Korting</th>
              <th className="text-right pb-2 font-medium">Per stuk</th>
            </tr>
          </thead>
          <tbody>
            {[...STAFFEL_KORTINGEN].reverse().map((tier, i, arr) => {
              const nextTier = arr[i + 1]
              const label = nextTier
                ? `${tier.vanaf}–${nextTier.vanaf - 1} stuks`
                : `${tier.vanaf}+ stuks`
              const isActive = korting === tier.pct
              return (
                <tr
                  key={tier.vanaf}
                  className={`border-t border-lx-divider ${isActive ? 'font-semibold text-lx-cta' : 'text-lx-text-primary'}`}
                >
                  <td className="py-2">{tier.vanaf === 1 ? '1–9 stuks' : label}</td>
                  <td className="py-2 text-right">{tier.pct > 0 ? `−${(tier.pct * 100).toFixed(1)}%` : '—'}</td>
                  <td className="py-2 text-right">€{calcStuksprijs(basisprijs, tier.vanaf).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Staffel-tip */}
      {tip && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-3">
          <svg className="flex-shrink-0 mt-0.5" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
          </svg>
          <p className="text-[12px] text-amber-800 leading-relaxed">
            Bestel er nog <strong>{tip.stuks}</strong> meer (totaal <strong>{tip.tierQty} stuks</strong>) en betaal{' '}
            <strong>€{tip.stuksprijsVolgend.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> per stuk{' '}
            in plaats van €{tip.stuksprijsNu.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} —{' '}
            bespaar <strong>€{(tip.stuksprijsNu - tip.stuksprijsVolgend).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> per stuk.
          </p>
        </div>
      )}

      {/* Aantal + verpakking */}
      <div className="bg-lx-panel-bg rounded-2xl p-4 space-y-4">
        <div className="flex items-center gap-4">
          <span className="text-[13px] font-medium text-lx-text-primary flex-shrink-0">Aantal</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => stepQty(-1)}
              className="w-9 h-9 rounded-xl bg-white border border-black/8 text-lx-text-primary text-lg font-light hover:bg-lx-border transition-colors flex items-center justify-center"
            >−</button>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => onQuantityChange(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 h-9 rounded-xl border-2 border-lx-cta text-center text-[14px] font-bold text-lx-cta bg-white outline-none"
            />
            <button
              onClick={() => stepQty(1)}
              className="w-9 h-9 rounded-xl bg-white border border-black/8 text-lx-text-primary text-lg font-light hover:bg-lx-border transition-colors flex items-center justify-center"
            >+</button>
          </div>
        </div>

        {showVerpakkingToggle && (
          <div className="flex items-center justify-between pt-1 border-t border-lx-divider">
            <div>
              <p className="text-[13px] font-medium text-lx-text-primary">Niet per stuk verpakken</p>
              <p className="text-[11.5px] text-lx-text-secondary">Bulk verpakking — geen folie/hoekjes per spiegel (−€{VERPAKKING_PER_STUK.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/stuk)</p>
            </div>
            <button
              role="switch"
              aria-checked={!verpakkingPerStuk}
              onClick={() => onVerpakkingChange(!verpakkingPerStuk)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${!verpakkingPerStuk ? 'bg-lx-cta' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${!verpakkingPerStuk ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        )}
      </div>

      {/* Prijs */}
      <div className="bg-lx-panel-bg rounded-xl px-4 py-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-lx-text-secondary">
            {quantity} × €{stuksprijs.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {korting > 0 && <span className="ml-1.5 text-lx-cta font-semibold">(−{(korting * 100).toFixed(1)}%)</span>}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-lx-divider pt-1.5">
          <span className="text-[12.5px] text-lx-text-secondary font-medium">Totaal netto ex. BTW</span>
          <span className="text-[18px] font-bold text-lx-cta">
            €{totaal.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Projectnaam */}
      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-lx-text-secondary">Projectgegevens</p>
        <div>
          <label className="text-[12px] font-semibold text-lx-text-secondary mb-1.5 block">
            Projectnaam <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
            placeholder="Bijv. Badkamer renovatie De Vries"
            className="w-full h-10 rounded-xl border border-black/12 px-3.5 text-[13.5px] text-lx-text-primary placeholder-lx-placeholder outline-none focus:border-lx-cta bg-white transition-colors"
          />
        </div>
      </div>

      {/* Actie */}
      <button
        onClick={onSave}
        disabled={!projectName.trim() || saving}
        className="w-full h-11 rounded-xl bg-lx-cta text-white text-[13.5px] font-semibold hover:bg-lx-cta-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saving ? 'Opslaan…' : 'Opslaan als offerte'}
      </button>
      {!projectName.trim() && (
        <p className="text-[11px] text-lx-text-secondary text-center">Vul een projectnaam in om op te slaan</p>
      )}
    </div>
  )
}
