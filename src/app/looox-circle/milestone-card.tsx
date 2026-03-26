'use client'

import { useState, useTransition, type ReactElement } from 'react'
import { claimCustomBenefit } from '@/lib/actions/milestones'

type UserMilestone = {
  id: string
  discount_code: string | null
  claimed_at: string | null
}

type MilestoneCardProps = {
  milestone: {
    id: string
    title: string
    description: string
    goal_type: string
    goal_value: number
    goal_shape: string | null
    benefit_type: string
    benefit_value: number | null
    benefit_description: string | null
    current: number
    pct: number
    done: boolean
    userMilestone: UserMilestone | null
    discountUsed: boolean
  }
}

const GOAL_ICONS: Record<string, ReactElement> = {
  configs: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>,
  orders: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" x2="21" y1="6" y2="6"/></svg>,
  order_revenue: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  shape: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/></svg>,
  streak: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
}

function goalText(milestone: MilestoneCardProps['milestone']) {
  if (milestone.goal_type === 'shape') return `Vorm configureren: ${milestone.goal_shape}`
  if (milestone.goal_type === 'order_revenue') return `€${Number(milestone.goal_value).toLocaleString('nl-NL')} totaal besteld`
  if (milestone.goal_type === 'streak') return `${milestone.goal_value} dagen op rij ingelogd`
  if (milestone.goal_type === 'configs') return `${milestone.goal_value} configuratie${Number(milestone.goal_value) !== 1 ? 's' : ''}`
  if (milestone.goal_type === 'orders') return `${milestone.goal_value} bestelling${Number(milestone.goal_value) !== 1 ? 'en' : ''}`
  return ''
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard not available (non-HTTPS or permission denied)
    }
  }
  return (
    <button onClick={copy}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-lx-icon-bg hover:bg-lx-divider text-lx-cta text-[11px] font-semibold transition-colors"
      title="Kopieer code"
    >
      {copied
        ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="13" height="13" x="9" y="9" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      }
      {copied ? 'Gekopieerd!' : 'Kopieer'}
    </button>
  )
}

function DownloadPdfButton({ userMilestoneId, initialClaimedAt }: {
  userMilestoneId: string
  initialClaimedAt: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [claimedAt, setClaimedAt] = useState(initialClaimedAt)

  function handleClick() {
    if (!claimedAt) {
      startTransition(async () => {
        const result = await claimCustomBenefit(userMilestoneId)
        if (result.success) setClaimedAt(new Date().toISOString())
      })
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-lx-divider">
      <a
        href={`/api/pdf/milestone/${userMilestoneId}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-lx-cta hover:bg-lx-cta-hover text-white text-[12.5px] font-semibold transition-colors ${isPending ? 'opacity-70 pointer-events-none' : ''}`}
      >
        {isPending ? (
          <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        )}
        Download voordeel PDF
      </a>
      {claimedAt && (
        <p className="text-[10.5px] text-lx-text-muted mt-2">
          Aangevraagd op {new Date(claimedAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      )}
      <p className="text-[11px] text-lx-text-secondary mt-1.5 leading-snug">
        Stuur dit document naar LoooX om je voordeel te activeren.
      </p>
    </div>
  )
}

export default function MilestoneCard({ milestone }: MilestoneCardProps) {
  const { done, userMilestone, discountUsed } = milestone
  const isUpcoming = !done && milestone.current === 0
  const goalIcon = GOAL_ICONS[milestone.goal_type]

  return (
    <div className={`rounded-[14px] p-4 border transition-colors ${
      done
        ? 'bg-white border-lx-cta/25'
        : isUpcoming
        ? 'bg-lx-panel-bg border-lx-divider'
        : 'bg-white border-lx-divider'
    }`}>
      {/* Koptekst */}
      <div className="flex items-start gap-2.5 mb-2.5">
        {done ? (
          <span className="w-5 h-5 rounded-full bg-lx-icon-bg flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </span>
        ) : (
          <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 ${
            milestone.current > 0 ? 'border-lx-cta/50' : 'border-lx-border'
          }`} />
        )}
        <div className="min-w-0 flex-1">
          <p className={`text-[13.5px] font-semibold leading-snug ${isUpcoming ? 'text-lx-text-secondary' : 'text-lx-text-primary'}`}>
            {milestone.title}
          </p>
          <p className={`text-[11.5px] mt-0.5 ${isUpcoming ? 'text-lx-placeholder' : 'text-lx-text-secondary'}`}>
            {milestone.description}
          </p>
        </div>
      </div>

      {/* Doel */}
      <div className={`flex items-center gap-1.5 text-[11px] mb-2.5 ${isUpcoming ? 'text-lx-placeholder' : 'text-lx-text-secondary'}`}>
        <span className={isUpcoming ? 'opacity-40' : 'opacity-60'}>{goalIcon}</span>
        {goalText(milestone)}
      </div>

      {/* Progress bar — alleen voor actieve milestones */}
      {!done && milestone.current > 0 && (
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span className="text-[10.5px] text-lx-text-secondary">
              {milestone.goal_type === 'order_revenue'
                ? `€${Math.round(milestone.current).toLocaleString('nl-NL')} van €${Number(milestone.goal_value).toLocaleString('nl-NL')}`
                : `${milestone.current} van ${milestone.goal_value}`}
            </span>
            <span className="text-[10.5px] text-lx-text-secondary">{milestone.pct}%</span>
          </div>
          <div className="h-1.5 bg-lx-divider rounded-full overflow-hidden">
            <div className="h-full bg-lx-cta rounded-full transition-all" style={{ width: `${milestone.pct}%` }} />
          </div>
        </div>
      )}

      {/* Voordeel label */}
      <p className={`text-[11px] ${done ? 'text-lx-cta font-medium' : isUpcoming ? 'text-lx-placeholder italic' : 'text-lx-text-secondary'}`}>
        Voordeel: {milestone.benefit_type === 'discount_pct'
          ? `${milestone.benefit_value}% korting`
          : milestone.benefit_type === 'discount_fixed'
          ? `€${milestone.benefit_value} korting`
          : (milestone.benefit_description ?? '—')}
      </p>

      {/* Behaald: toon kortingscode of PDF download */}
      {done && userMilestone && (
        <>
          {(milestone.benefit_type === 'discount_pct' || milestone.benefit_type === 'discount_fixed') && userMilestone.discount_code && (
            <div className="mt-3 pt-3 border-t border-lx-divider">
              <p className="text-[11px] text-lx-text-secondary mb-1.5">
                {discountUsed ? 'Kortingscode (gebruikt)' : 'Jouw kortingscode:'}
              </p>
              <div className="flex items-center gap-2">
                <span className={`font-mono text-[13px] font-bold tracking-widest px-3 py-1.5 rounded-lg ${
                  discountUsed
                    ? 'line-through text-lx-text-secondary bg-lx-divider'
                    : 'text-lx-text-primary bg-lx-panel-bg'
                }`}>
                  {userMilestone.discount_code}
                </span>
                {!discountUsed && <CopyButton code={userMilestone.discount_code} />}
              </div>
              {discountUsed && (
                <p className="text-[10.5px] text-lx-text-muted mt-1.5">Deze code is al eens gebruikt.</p>
              )}
            </div>
          )}
          {milestone.benefit_type === 'custom' && (
            <DownloadPdfButton
              userMilestoneId={userMilestone.id}
              initialClaimedAt={userMilestone.claimed_at}
            />
          )}
        </>
      )}
    </div>
  )
}
