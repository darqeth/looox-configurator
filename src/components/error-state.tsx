'use client'

import { useEffect } from 'react'
import Link from 'next/link'

// Gedeelde foutweergave voor error.tsx boundaries (audit U6) — voorheen
// kregen gebruikers het kale Engelse "Application error"-scherm van Next.
export function ErrorState({
  error,
  reset,
  title = 'Er is iets misgegaan',
}: {
  error: Error & { digest?: string }
  reset: () => void
  title?: string
}) {
  useEffect(() => {
    console.error('[error-boundary]', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="bg-white rounded-[18px] border border-black/6 shadow-sm p-8 max-w-md w-full text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="text-[17px] font-bold text-lx-text-primary mb-1.5">{title}</h1>
        <p className="text-[13px] text-lx-text-secondary leading-relaxed mb-5">
          Probeer het opnieuw. Blijft dit gebeuren, neem dan contact op via de hulpknop rechtsonder.
        </p>
        {error.digest && (
          <p className="text-[11px] text-lx-placeholder mb-4">Foutcode: {error.digest}</p>
        )}
        <div className="flex gap-2.5 justify-center">
          <button
            onClick={reset}
            className="px-5 h-10 rounded-xl bg-lx-cta text-white text-[13px] font-semibold hover:bg-lx-cta-hover transition-colors"
          >
            Probeer opnieuw
          </button>
          <Link
            href="/dashboard"
            className="px-5 h-10 rounded-xl border border-black/10 text-lx-text-secondary text-[13px] font-semibold hover:bg-lx-panel-bg transition-colors inline-flex items-center"
          >
            Naar dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
