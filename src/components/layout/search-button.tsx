'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

type ConfigResult = { id: string; name: string; shape: string; dims: string; href: string }
type OrderResult = { id: string; orderNumber: string; configName: string; shape: string; dims: string; status: string; href: string }
type SearchResults = { configs: ConfigResult[]; orders: OrderResult[] }

export default function SearchButton({ variant = 'default' }: { variant?: 'default' | 'sidebar' }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open) { inputRef.current?.focus(); setQuery(''); setResults(null) }
  }, [open])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(v => !v) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.trim().length < 2) { setResults(null); setLoading(false); return }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
        const data = await res.json()
        setResults(data)
      } catch {
        setResults({ configs: [], orders: [] })
      } finally {
        setLoading(false)
      }
    }, 280)
  }, [])

  const hasResults = results && (results.configs.length > 0 || results.orders.length > 0)
  const isEmpty = results && !hasResults

  const searchIcon = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>

  return (
    <>
      {variant === 'sidebar' ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/7 hover:bg-white/11 text-white/55 hover:text-white/90 transition-all text-[13.5px] font-medium"
          aria-label="Zoeken"
        >
          {searchIcon}
          <span>Zoeken</span>
          <kbd className="ml-auto text-[10px] bg-white/8 text-white/38 px-1.5 py-px rounded font-mono leading-tight">⌘K</kbd>
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="w-9 h-9 rounded-xl bg-white border border-black/8 shadow-sm flex items-center justify-center text-lx-text-secondary hover:text-lx-text-primary transition-colors"
          aria-label="Zoeken"
        >
          {searchIcon}
        </button>
      )}

      {open && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="fixed z-50 top-4 left-4 right-4 sm:top-[12%] sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-full sm:max-w-lg sm:px-4">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-black/8">
              {/* Zoekbalk */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-lx-divider">
                {loading
                  ? <svg className="animate-spin flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lx-text-secondary)" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lx-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                }
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => { setQuery(e.target.value); search(e.target.value) }}
                  placeholder="Zoek op projectnaam, ordernummer, vorm…"
                  className="flex-1 text-[14px] text-lx-text-primary placeholder-lx-inactive outline-none bg-transparent"
                />
                <button
                  onClick={() => setOpen(false)}
                  className="hidden sm:block text-[11px] text-lx-text-secondary bg-lx-panel-bg px-2 py-1 rounded-lg hover:bg-lx-border transition-colors"
                >
                  Esc
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="sm:hidden text-lx-text-secondary hover:text-lx-text-primary transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>

              {/* Resultaten */}
              {hasResults && (
                <div className="max-h-[60vh] overflow-y-auto divide-y divide-lx-divider">
                  {results.configs.length > 0 && (
                    <div>
                      <p className="px-4 pt-3 pb-1.5 text-[11px] font-semibold text-lx-text-secondary uppercase tracking-wide">Configuraties</p>
                      {results.configs.map(c => (
                        <Link
                          key={c.id}
                          href={c.href}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-lx-panel-bg transition-colors"
                        >
                          <div className="w-7 h-7 rounded-lg bg-lx-icon-bg flex items-center justify-center flex-shrink-0">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/></svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-lx-text-primary truncate">{c.name}</p>
                            <p className="text-[11px] text-lx-text-secondary">{c.shape}{c.dims ? ` · ${c.dims}` : ''}</p>
                          </div>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--lx-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M9 18l6-6-6-6"/></svg>
                        </Link>
                      ))}
                    </div>
                  )}
                  {results.orders.length > 0 && (
                    <div>
                      <p className="px-4 pt-3 pb-1.5 text-[11px] font-semibold text-lx-text-secondary uppercase tracking-wide">Bestellingen</p>
                      {results.orders.map(o => (
                        <Link
                          key={o.id}
                          href={o.href}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-lx-panel-bg transition-colors"
                        >
                          <div className="w-7 h-7 rounded-lg bg-lx-icon-bg flex items-center justify-center flex-shrink-0">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--lx-cta)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-lx-text-primary font-mono tracking-wide">{o.orderNumber}</p>
                            <p className="text-[11px] text-lx-text-secondary truncate">{o.configName} · {o.shape}{o.dims ? ` · ${o.dims}` : ''}</p>
                          </div>
                          <span className="text-[10.5px] font-medium text-lx-text-secondary flex-shrink-0">{o.status}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Lege staat */}
              {isEmpty && (
                <div className="px-4 py-8 text-center">
                  <p className="text-[13px] text-lx-text-secondary">Geen resultaten voor &ldquo;{query}&rdquo;</p>
                </div>
              )}

              {/* Idle staat */}
              {!results && !loading && (
                <div className="px-4 py-6 text-center">
                  <p className="text-[12px] text-lx-text-secondary">Zoek op projectnaam, ordernummer, bijzonderheden of vorm</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
