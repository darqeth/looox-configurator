'use client'

import { useState, useEffect, useRef } from 'react'

export default function SearchButton() {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-9 h-9 rounded-xl bg-white border border-black/8 shadow-sm flex items-center justify-center text-[#6B7280] hover:text-[#1A1A1A] transition-colors"
        aria-label="Zoeken"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Zoekvenster — mobiel: bovenkant, desktop: gecentreerd */}
          <div className="fixed z-50 top-4 left-4 right-4 sm:top-[15%] sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-full sm:max-w-lg sm:px-4">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-black/8">
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#F0EDE8]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Zoek configuraties, bestellingen…"
                  className="flex-1 text-[14px] text-[#1A1A1A] placeholder-[#9CA3AF] outline-none bg-transparent"
                />
                {/* Esc knop — alleen desktop */}
                <button
                  onClick={() => setOpen(false)}
                  className="hidden sm:block text-[11px] text-[#9CA3AF] bg-[#F5F3EF] px-2 py-1 rounded-lg hover:bg-[#EDE9E3] transition-colors"
                >
                  Esc
                </button>
                {/* Sluiten — alleen mobiel */}
                <button
                  onClick={() => setOpen(false)}
                  className="sm:hidden text-[#9CA3AF] hover:text-[#1A1A1A] transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="px-4 py-8 text-center">
                <p className="text-[13px] text-[#9CA3AF]">Typ om te zoeken in configuraties en bestellingen</p>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
