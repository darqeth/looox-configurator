'use client'

import { ErrorState } from '@/components/error-state'

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-lx-divider">
      <ErrorState error={error} reset={reset} />
    </div>
  )
}
