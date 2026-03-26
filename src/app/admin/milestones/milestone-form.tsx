'use client'

import { useState, useTransition } from 'react'
import { createMilestone, type MilestoneGoalType, type MilestoneBenefitType } from '@/lib/actions/milestones'

const GOAL_TYPES: { key: MilestoneGoalType; label: string; unit: string; hasShape?: boolean }[] = [
  { key: 'configs',        label: 'Configuraties',      unit: 'stuks' },
  { key: 'orders',         label: 'Bestellingen',       unit: 'stuks' },
  { key: 'order_revenue',  label: 'Totaal besteld',     unit: '€' },
  { key: 'shape',          label: 'Vorm geconfigureerd', unit: '', hasShape: true },
  { key: 'streak',         label: 'Dagen op rij ingelogd', unit: 'dagen' },
]

const SHAPES = [
  { key: 'rechthoek', label: 'Rechthoek' },
  { key: 'rond',      label: 'Rond' },
  { key: 'organic',   label: 'Organic' },
  { key: 'op-aanvraag', label: 'Op aanvraag' },
]

const BENEFIT_TYPES: { key: MilestoneBenefitType; label: string }[] = [
  { key: 'discount_pct',   label: '% korting' },
  { key: 'discount_fixed', label: '€ korting' },
  { key: 'custom',         label: 'Vrij voordeel' },
]

export default function MilestoneForm() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [goalType, setGoalType] = useState<MilestoneGoalType>('orders')
  const [goalValue, setGoalValue] = useState('')
  const [goalShape, setGoalShape] = useState('rechthoek')
  const [benefitType, setBenefitType] = useState<MilestoneBenefitType>('custom')
  const [benefitValue, setBenefitValue] = useState('')
  const [benefitDescription, setBenefitDescription] = useState('')

  const selectedGoal = GOAL_TYPES.find(g => g.key === goalType)!

  function reset() {
    setTitle(''); setDescription(''); setGoalType('orders'); setGoalValue('')
    setGoalShape('rechthoek'); setBenefitType('custom'); setBenefitValue(''); setBenefitDescription('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    startTransition(async () => {
      const result = await createMilestone({
        title,
        description,
        goal_type: goalType,
        goal_value: selectedGoal.hasShape ? 1 : Number(goalValue),
        goal_shape: goalType === 'shape' ? goalShape : null,
        benefit_type: benefitType,
        benefit_value: benefitType !== 'custom' ? Number(benefitValue) : null,
        benefit_description: benefitType === 'custom' ? benefitDescription : null,
      })
      if (!result.error) {
        reset(); setOpen(false); setDone(true)
        setTimeout(() => setDone(false), 2000)
      }
    })
  }

  return (
    <div className="mb-6">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-lx-cta hover:bg-lx-cta-hover text-white text-[13px] font-semibold rounded-xl transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
          {done ? 'Mijlpaal aangemaakt!' : 'Nieuwe mijlpaal'}
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-black/8 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[13.5px] font-semibold text-lx-text-primary">Nieuwe mijlpaal</p>
            <button type="button" onClick={() => { setOpen(false); reset() }} className="text-lx-text-secondary hover:text-lx-text-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Titel */}
          <div>
            <label className="block text-[11.5px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-1.5">
              Titel <span className="text-red-400">*</span>
            </label>
            <input
              value={title} onChange={e => setTitle(e.target.value)} required maxLength={60}
              placeholder="Bijv. Vaste partner"
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/12 text-[13px] text-lx-text-primary placeholder:text-lx-placeholder focus:outline-none focus:border-lx-cta transition-colors"
            />
          </div>

          {/* Omschrijving */}
          <div>
            <label className="block text-[11.5px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-1.5">Omschrijving</label>
            <input
              value={description} onChange={e => setDescription(e.target.value)} maxLength={120}
              placeholder="Bijv. Bereik 5 bestellingen via het portaal."
              className="w-full px-3.5 py-2.5 rounded-xl border border-black/12 text-[13px] text-lx-text-primary placeholder:text-lx-placeholder focus:outline-none focus:border-lx-cta transition-colors"
            />
          </div>

          {/* Doel type */}
          <div>
            <label className="block text-[11.5px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-1.5">Doel</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {GOAL_TYPES.map(g => (
                <button key={g.key} type="button" onClick={() => setGoalType(g.key)}
                  className={`px-3 py-1.5 rounded-xl text-[12px] font-medium border transition-all ${
                    goalType === g.key ? 'bg-lx-cta text-white border-lx-cta' : 'bg-white text-lx-text-secondary border-black/12 hover:border-lx-cta/50'
                  }`}>
                  {g.label}
                </button>
              ))}
            </div>
            {selectedGoal.hasShape ? (
              <div>
                <label className="block text-[11.5px] text-lx-text-secondary mb-1.5">Welke vorm?</label>
                <div className="flex gap-2 flex-wrap">
                  {SHAPES.map(s => (
                    <button key={s.key} type="button" onClick={() => setGoalShape(s.key)}
                      className={`px-3 py-1.5 rounded-xl text-[12px] font-medium border transition-all ${
                        goalShape === s.key ? 'bg-lx-cta text-white border-lx-cta' : 'bg-white text-lx-text-secondary border-black/12 hover:border-lx-cta/50'
                      }`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <input
                  type="number" min="1" value={goalValue} onChange={e => setGoalValue(e.target.value)} required
                  placeholder="Bijv. 5"
                  className="w-28 px-3.5 py-2.5 rounded-xl border border-black/12 text-[13px] text-lx-text-primary focus:outline-none focus:border-lx-cta transition-colors"
                />
                <span className="text-[13px] text-lx-text-secondary">{selectedGoal.unit}</span>
              </div>
            )}
          </div>

          {/* Voordeel type */}
          <div>
            <label className="block text-[11.5px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-1.5">Voordeel</label>
            <div className="flex gap-2 mb-3">
              {BENEFIT_TYPES.map(b => (
                <button key={b.key} type="button" onClick={() => setBenefitType(b.key)}
                  className={`px-3 py-1.5 rounded-xl text-[12px] font-medium border transition-all ${
                    benefitType === b.key ? 'bg-lx-cta text-white border-lx-cta' : 'bg-white text-lx-text-secondary border-black/12 hover:border-lx-cta/50'
                  }`}>
                  {b.label}
                </button>
              ))}
            </div>
            {benefitType === 'discount_pct' && (
              <div className="flex items-center gap-3">
                <input type="number" min="1" max="100" value={benefitValue} onChange={e => setBenefitValue(e.target.value)} required
                  placeholder="Bijv. 10"
                  className="w-28 px-3.5 py-2.5 rounded-xl border border-black/12 text-[13px] text-lx-text-primary focus:outline-none focus:border-lx-cta transition-colors"
                />
                <span className="text-[13px] text-lx-text-secondary">% korting op volgende bestelling</span>
              </div>
            )}
            {benefitType === 'discount_fixed' && (
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-lx-text-secondary">€</span>
                <input type="number" min="1" value={benefitValue} onChange={e => setBenefitValue(e.target.value)} required
                  placeholder="Bijv. 50"
                  className="w-28 px-3.5 py-2.5 rounded-xl border border-black/12 text-[13px] text-lx-text-primary focus:outline-none focus:border-lx-cta transition-colors"
                />
                <span className="text-[13px] text-lx-text-secondary">korting op volgende bestelling</span>
              </div>
            )}
            {benefitType === 'custom' && (
              <input value={benefitDescription} onChange={e => setBenefitDescription(e.target.value)} required maxLength={100}
                placeholder="Bijv. Persoonlijke onboarding call met LoooX"
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/12 text-[13px] text-lx-text-primary placeholder:text-lx-placeholder focus:outline-none focus:border-lx-cta transition-colors"
              />
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-lx-cta text-white text-[13px] font-semibold hover:bg-lx-cta-hover disabled:opacity-40 transition-all">
              {isPending
                ? <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              }
              {isPending ? 'Opslaan…' : 'Aanmaken'}
            </button>
            <button type="button" onClick={() => { setOpen(false); reset() }}
              className="px-4 py-2.5 rounded-xl border border-black/12 text-[13px] text-lx-text-secondary hover:bg-lx-panel-bg transition-colors">
              Annuleren
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
