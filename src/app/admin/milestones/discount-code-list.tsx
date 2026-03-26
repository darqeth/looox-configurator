'use client'

import { useState, useTransition } from 'react'
import { deleteDiscountCode } from '@/lib/actions/milestones'

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <button onClick={copy} title="Kopieer code"
      className="w-7 h-7 rounded-lg flex items-center justify-center text-lx-text-secondary hover:text-lx-cta hover:bg-lx-icon-bg transition-colors">
      {copied
        ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="13" height="13" x="9" y="9" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      }
    </button>
  )
}

export type Code = {
  id: string
  code: string
  type: 'pct' | 'fixed'
  value: number
  use_type: 'single' | 'per_user'
  used_at: string | null
  expires_at: string | null
  created_at: string
  use_count: number
  profiles: { company: string | null; full_name: string | null } | null
}

function DeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()
  return (
    <button onClick={() => { if (confirm('Code verwijderen?')) startTransition(async () => { await deleteDiscountCode(id) }) }}
      disabled={isPending}
      className="w-7 h-7 rounded-lg flex items-center justify-center text-lx-text-secondary hover:text-red-500 hover:bg-red-50 transition-colors">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/></svg>
    </button>
  )
}

export default function DiscountCodeList({ codes }: { codes: Code[] }) {
  return (
    <div>
      <p className="text-[12px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-3">
        Standalone codes ({codes.length})
      </p>
      <div className="space-y-2">
        {codes.length === 0 ? (
          <p className="text-[13px] text-lx-text-secondary py-6 text-center bg-white rounded-xl border border-black/8">
            Nog geen codes aangemaakt.
          </p>
        ) : codes.map(c => {
          const label = c.type === 'pct' ? `${c.value}%` : `€${Number(c.value).toLocaleString('nl-NL')}`
          const owner = c.profiles?.company ?? c.profiles?.full_name ?? 'Alle dealers'
          const expired = c.expires_at && new Date(c.expires_at) < new Date()
          const isPerUser = c.use_type === 'per_user'
          const fullyUsed = !isPerUser && !!c.used_at
          return (
            <div key={c.id} className={`bg-white rounded-xl border border-black/8 px-4 py-3.5 flex items-center gap-3 ${fullyUsed || expired ? 'opacity-50' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="font-mono text-[13px] font-bold text-lx-text-primary tracking-wide">{c.code}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${c.type === 'pct' ? 'bg-lx-icon-bg text-lx-cta' : 'bg-blue-50 text-blue-700'}`}>
                    {label} korting
                  </span>
                  {isPerUser
                    ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700">Per dealer · {c.use_count}× gebruikt</span>
                    : fullyUsed && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-lx-panel-bg text-lx-text-secondary">Gebruikt</span>
                  }
                  {!fullyUsed && expired && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-50 text-red-600">Verlopen</span>}
                </div>
                <p className="text-[12px] text-lx-text-secondary">
                  {isPerUser ? 'Alle dealers' : owner}
                  {c.expires_at && !expired && ` · geldig t/m ${new Date(c.expires_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                </p>
              </div>
              {!fullyUsed && <CopyButton code={c.code} />}
              {!fullyUsed && <DeleteButton id={c.id} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
