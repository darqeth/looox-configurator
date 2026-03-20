'use client'

import { useSearchParams } from 'next/navigation'
import { signOut } from '@/lib/actions/auth'

export default function PendingContent() {
  const searchParams = useSearchParams()
  const isRejected = searchParams.get('rejected') === 'true'

  return (
    <div className="min-h-screen bg-lx-divider flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <img src="/logo-looox-grey.svg" alt="LoooX" className="h-24 mx-auto mb-2" />
          <p className="text-sm text-lx-text-secondary">Configurator</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-md border border-black/5 p-6 sm:p-8 text-center">
          {isRejected ? (
            <>
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-lx-text-primary mb-2">
                Toegang niet verleend
              </h2>
              <p className="text-sm text-lx-text-secondary leading-relaxed">
                Je aanvraag is helaas niet goedgekeurd. Neem contact op als je
                denkt dat dit een vergissing is.
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-lx-panel-bg/50 rounded-full flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-lx-cta" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-lx-text-primary mb-2">
                Aanvraag ontvangen
              </h2>
              <p className="text-sm text-lx-text-secondary leading-relaxed mb-6">
                Je account wordt beoordeeld door LoooX. Dit duurt doorgaans{' '}
                <span className="inline-block px-1.5 py-0.5 bg-lx-panel-bg rounded text-lx-cta font-semibold">
                  binnen 1 werkdag
                </span>
                . Je ontvangt een e-mail zodra je toegang hebt.
              </p>

              {/* Timeline */}
              <div className="text-left space-y-4 mb-6">
                {[
                  { label: 'Aanvraag ingediend', done: true, active: false },
                  { label: 'Beoordeling door LoooX', done: false, active: true },
                  { label: 'Toegang verleend', done: false, active: false },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        step.done
                          ? 'bg-lx-panel-bg'
                          : step.active
                            ? 'border-2 border-lx-cta bg-white'
                            : 'bg-gray-100'
                      }`}
                    >
                      {step.done && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span
                      className={`text-sm ${
                        step.done
                          ? 'text-lx-text-primary font-medium'
                          : step.active
                            ? 'text-lx-cta font-semibold'
                            : 'text-lx-text-secondary'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Contact */}
          <div className="border-t border-gray-100 pt-5">
            <p className="text-xs text-lx-text-secondary mb-3">Vragen?</p>
            <a
              href="mailto:info@looox.nl"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-lx-panel-bg text-lx-cta rounded-lg text-sm font-semibold hover:bg-lx-panel-bg/70 transition-colors"
            >
              info@looox.nl
            </a>
          </div>
        </div>

        {/* Uitloggen */}
        <div className="text-center mt-5">
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-lx-text-secondary hover:text-lx-cta transition-colors"
            >
              ← Uitloggen
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
