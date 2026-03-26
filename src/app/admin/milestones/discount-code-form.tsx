'use client'

import { useState, useTransition } from 'react'
import { createDiscountCode } from '@/lib/actions/milestones'

export default function DiscountCodeForm() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [lastCode, setLastCode] = useState<string | null>(null)

  const [type, setType] = useState<'pct' | 'fixed'>('pct')
  const [useType, setUseType] = useState<'single' | 'per_user'>('single')
  const [value, setValue] = useState('')
  const [expires, setExpires] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await createDiscountCode({ type, value: Number(value), expires_at: expires || null, use_type: useType })
      if (!result.error && result.code) {
        setLastCode(result.code)
        setValue(''); setExpires(''); setOpen(false)
      }
    })
  }

  return (
    <div className="mb-6">
      {lastCode && (
        <div className="mb-4 flex items-center gap-3 bg-lx-icon-bg border border-lx-cta/20 rounded-xl px-4 py-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span className="text-[12.5px] text-lx-text-primary">Code aangemaakt: <span className="font-mono font-bold">{lastCode}</span></span>
          <button onClick={() => setLastCode(null)} className="ml-auto text-lx-text-secondary hover:text-lx-text-primary">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      )}

      {!open ? (
        <button onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-lx-cta hover:bg-lx-cta-hover text-white text-[13px] font-semibold rounded-xl transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
          Nieuwe kortingscode
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-black/8 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[13.5px] font-semibold text-lx-text-primary">Nieuwe kortingscode</p>
            <button type="button" onClick={() => setOpen(false)} className="text-lx-text-secondary hover:text-lx-text-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Type */}
          <div>
            <label className="block text-[11.5px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-1.5">Type</label>
            <div className="flex gap-2">
              {([{ key: 'pct', label: '% korting' }, { key: 'fixed', label: '€ korting' }] as const).map(t => (
                <button key={t.key} type="button" onClick={() => setType(t.key)}
                  className={`px-3.5 py-1.5 rounded-xl text-[12.5px] font-semibold border transition-all ${
                    type === t.key ? 'bg-lx-cta text-white border-lx-cta' : 'bg-white text-lx-text-secondary border-black/12 hover:border-lx-cta/50'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Waarde */}
          <div>
            <label className="block text-[11.5px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-1.5">
              Waarde <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center gap-2">
              {type === 'fixed' && <span className="text-[13px] text-lx-text-secondary">€</span>}
              <input type="number" min="1" max={type === 'pct' ? 100 : undefined} value={value}
                onChange={e => setValue(e.target.value)} required
                placeholder={type === 'pct' ? 'Bijv. 10' : 'Bijv. 50'}
                className="w-28 px-3.5 py-2.5 rounded-xl border border-black/12 text-[13px] text-lx-text-primary focus:outline-none focus:border-lx-cta transition-colors"
              />
              {type === 'pct' && <span className="text-[13px] text-lx-text-secondary">%</span>}
            </div>
          </div>

          {/* Gebruik */}
          <div>
            <label className="block text-[11.5px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-1.5">Gebruik</label>
            <div className="flex gap-2">
              {([{ key: 'single', label: 'Eenmalig' }, { key: 'per_user', label: 'Per dealer (elk 1×)' }] as const).map(u => (
                <button key={u.key} type="button" onClick={() => setUseType(u.key)}
                  className={`px-3.5 py-1.5 rounded-xl text-[12.5px] font-semibold border transition-all ${
                    useType === u.key ? 'bg-lx-cta text-white border-lx-cta' : 'bg-white text-lx-text-secondary border-black/12 hover:border-lx-cta/50'
                  }`}>
                  {u.label}
                </button>
              ))}
            </div>
            {useType === 'per_user' && (
              <p className="text-[11px] text-lx-text-secondary mt-1.5">Elke dealer kan de code 1× gebruiken. Bijv. een Black Friday actie.</p>
            )}
          </div>

          {/* Vervaldatum */}
          <div>
            <label className="block text-[11.5px] font-semibold text-lx-text-secondary uppercase tracking-wide mb-1.5">
              Geldig tot <span className="text-lx-text-muted font-normal">(optioneel)</span>
            </label>
            <input type="date" value={expires} onChange={e => setExpires(e.target.value)}
              className="w-48 px-3.5 py-2.5 rounded-xl border border-black/12 text-[13px] text-lx-text-primary focus:outline-none focus:border-lx-cta transition-colors"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={isPending || !value}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-lx-cta text-white text-[13px] font-semibold hover:bg-lx-cta-hover disabled:opacity-40 transition-all">
              {isPending
                ? <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                : null
              }
              {isPending ? 'Aanmaken…' : 'Code genereren'}
            </button>
            <button type="button" onClick={() => setOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-black/12 text-[13px] text-lx-text-secondary hover:bg-lx-panel-bg transition-colors">
              Annuleren
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
