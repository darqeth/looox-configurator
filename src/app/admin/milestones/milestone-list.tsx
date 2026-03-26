'use client'

import { useTransition } from 'react'
import { deleteMilestone, updateMilestone, type Milestone } from '@/lib/actions/milestones'

const GOAL_LABELS: Record<string, string> = {
  configs: 'configuraties',
  orders: 'bestellingen',
  order_revenue: 'totaal besteld',
  shape: 'vorm geconfigureerd',
  streak: 'dagen op rij ingelogd',
}

const BENEFIT_BADGES: Record<string, { label: string; style: string }> = {
  discount_pct:   { label: '% korting',    style: 'bg-lx-icon-bg text-lx-cta' },
  discount_fixed: { label: '€ korting',    style: 'bg-blue-50 text-blue-700' },
  custom:         { label: 'Vrij voordeel', style: 'bg-amber-50 text-amber-700' },
}

function goalLabel(m: Milestone) {
  if (m.goal_type === 'shape') return `Vorm: ${m.goal_shape}`
  if (m.goal_type === 'order_revenue') return `€${Number(m.goal_value).toLocaleString('nl-NL')} ${GOAL_LABELS[m.goal_type]}`
  return `${m.goal_value} ${GOAL_LABELS[m.goal_type]}`
}

function benefitLabel(m: Milestone) {
  if (m.benefit_type === 'discount_pct') return `${m.benefit_value}% korting`
  if (m.benefit_type === 'discount_fixed') return `€${m.benefit_value} korting`
  return m.benefit_description ?? '—'
}

function ToggleButton({ milestone }: { milestone: Milestone }) {
  const [isPending, startTransition] = useTransition()
  return (
    <button
      onClick={() => startTransition(async () => { await updateMilestone(milestone.id, { is_active: !milestone.is_active }) })}

      disabled={isPending}
      className={`relative w-9 h-5 rounded-full transition-colors ${milestone.is_active ? 'bg-lx-cta' : 'bg-lx-divider'}`}
      title={milestone.is_active ? 'Deactiveren' : 'Activeren'}
    >
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${milestone.is_active ? 'left-4' : 'left-0.5'}`} />
    </button>
  )
}

function DeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()
  return (
    <button
      onClick={() => { if (confirm('Mijlpaal verwijderen?')) startTransition(async () => { await deleteMilestone(id) }) }}
      disabled={isPending}
      className="w-7 h-7 rounded-lg flex items-center justify-center text-lx-text-secondary hover:text-red-500 hover:bg-red-50 transition-colors"
      title="Verwijderen"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/></svg>
    </button>
  )
}

export default function MilestoneList({ milestones }: { milestones: Milestone[] }) {
  const badge = (m: Milestone) => BENEFIT_BADGES[m.benefit_type]

  return (
    <div>
      <p className="text-[12px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-3">
        Mijlpalen ({milestones.length})
      </p>
      <div className="space-y-2">
        {milestones.length === 0 ? (
          <p className="text-[13px] text-lx-text-secondary py-6 text-center bg-white rounded-xl border border-black/8">
            Nog geen mijlpalen aangemaakt.
          </p>
        ) : milestones.map(m => {
          const b = badge(m)
          return (
            <div key={m.id} className={`bg-white rounded-xl border border-black/8 px-4 py-3.5 flex items-center gap-3 ${!m.is_active ? 'opacity-50' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${b.style}`}>{b.label}</span>
                  <span className="text-[11px] text-lx-text-muted">Doel: {goalLabel(m)}</span>
                </div>
                <p className="text-[13.5px] font-semibold text-lx-text-primary">{m.title}</p>
                <p className="text-[12px] text-lx-text-secondary mt-0.5">Voordeel: {benefitLabel(m)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <ToggleButton milestone={m} />
                <DeleteButton id={m.id} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
