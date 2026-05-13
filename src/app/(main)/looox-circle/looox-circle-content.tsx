'use client'

import Link from 'next/link'
import MilestoneCelebration from './milestone-celebration'
import MilestoneCard from './milestone-card'
import type { LoooxCircleData } from '@/lib/queries/fetch-looox-circle'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function LoooxCircleContentSkeleton() {
  return (
    <div className="animate-pulse max-w-3xl px-4 sm:px-6 lg:px-7 pb-4 sm:pb-6 lg:pb-7">
      {/* Header card */}
      <div className="bg-white rounded-[18px] border border-black/6 shadow-sm px-6 py-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="h-5 w-28 bg-lx-divider rounded" />
            <div className="h-3.5 w-48 bg-lx-divider rounded" />
          </div>
          <div className="text-right space-y-1">
            <div className="h-6 w-10 bg-lx-divider rounded ml-auto" />
            <div className="h-3 w-24 bg-lx-divider rounded" />
          </div>
        </div>
        <div className="mt-4 h-2 w-full bg-lx-divider rounded-full" />
      </div>

      {/* Milestone grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-[18px] border border-black/6 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-lx-divider" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-32 bg-lx-divider rounded" />
                <div className="h-3 w-20 bg-lx-divider rounded" />
              </div>
            </div>
            <div className="h-2 w-full bg-lx-divider rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Data component ───────────────────────────────────────────────────────────

export function LoooxCircleContent({ data }: { data: LoooxCircleData }) {
  const { company, createdAt, milestones: milestonesWithProgress, celebrationMilestones } = data
  const achieved = milestonesWithProgress.filter(m => m.done)
  const inProgress = milestonesWithProgress.filter(m => !m.done && m.current > 0)
  const upcoming = milestonesWithProgress.filter(m => !m.done && m.current === 0)

  return (
    <>
      <MilestoneCelebration milestones={celebrationMilestones} />

      {/* Header */}
      <div className="bg-white rounded-[18px] border border-black/6 shadow-sm px-6 py-5 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[20px] font-bold text-lx-text-primary tracking-tight mb-1">LoooX Circle</h1>
            <p className="text-[13px] text-lx-text-secondary">
              {company} · lid sinds {createdAt
                ? new Date(createdAt).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
                : '—'}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[22px] font-bold text-lx-text-primary leading-none">{achieved.length}</p>
            <p className="text-[12px] text-lx-text-secondary mt-0.5">van {milestonesWithProgress.length} behaald</p>
          </div>
        </div>

        {milestonesWithProgress.length > 0 && (
          <div className="mt-4">
            <div className="h-2 bg-lx-divider rounded-full overflow-hidden">
              <div
                className="h-full bg-lx-cta rounded-full transition-all duration-500"
                style={{ width: `${Math.round((achieved.length / milestonesWithProgress.length) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* In uitvoering */}
      {inProgress.length > 0 && (
        <div className="mb-4">
          <p className="text-[11px] font-bold text-lx-text-secondary uppercase tracking-widest mb-3 px-1">In uitvoering</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {inProgress.map(m => <MilestoneCard key={m.id} milestone={m} />)}
          </div>
        </div>
      )}

      {/* Behaald */}
      {achieved.length > 0 && (
        <div className="mb-4">
          <p className="text-[11px] font-bold text-lx-text-secondary uppercase tracking-widest mb-3 px-1">Behaald</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {achieved.map(m => <MilestoneCard key={m.id} milestone={m} />)}
          </div>
        </div>
      )}

      {/* Nog te behalen */}
      {upcoming.length > 0 && (
        <div className="mb-4">
          <p className="text-[11px] font-bold text-lx-text-secondary uppercase tracking-widest mb-3 px-1">Nog te behalen</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {upcoming.map(m => <MilestoneCard key={m.id} milestone={m} />)}
          </div>
        </div>
      )}

      {milestonesWithProgress.length === 0 && (
        <div className="bg-white rounded-[18px] border border-black/6 shadow-sm px-6 py-12 text-center">
          <p className="text-[14px] font-semibold text-lx-text-primary mb-1">Nog geen mijlpalen beschikbaar</p>
          <p className="text-[13px] text-lx-text-secondary">LoooX voegt binnenkort doelen toe.</p>
        </div>
      )}

      {/* CTA */}
      <div className="bg-lx-cta rounded-[18px] px-6 py-6 mt-2">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-white text-[15px] font-bold mb-1">Blijf configureren</p>
            <p className="text-white/70 text-[13px] leading-relaxed max-w-sm">
              Elke configuratie en bestelling brengt je dichter bij je volgende mijlpaal.
            </p>
          </div>
          <Link
            href="/configurator/nieuw"
            className="inline-flex items-center gap-2 bg-white hover:bg-lx-icon-bg text-lx-cta text-[13px] font-semibold px-5 py-2.5 rounded-xl transition-colors flex-shrink-0"
          >
            Nieuwe configuratie
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </div>
      </div>
    </>
  )
}
