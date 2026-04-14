import { Suspense } from 'react'
import { LoooxCircleContent, LoooxCircleContentSkeleton } from './looox-circle-content'

export default function LoooxCirclePage() {
  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-3xl">
      <Suspense fallback={<LoooxCircleContentSkeleton />}>
        <LoooxCircleContent />
      </Suspense>
    </div>
  )
}
