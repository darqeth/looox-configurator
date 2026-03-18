import { Suspense } from 'react'
import PendingContent from './pending-content'

export default function PendingPage() {
  return (
    <Suspense>
      <PendingContent />
    </Suspense>
  )
}
