import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { fetchLoooxCircle } from '@/lib/queries/fetch-looox-circle'
import { LoooxCircleContent, LoooxCircleContentSkeleton } from './looox-circle-content'

async function LoooxCircleData() {
  const data = await fetchLoooxCircle()
  return <LoooxCircleContent data={data} />
}

export default async function LoooxCirclePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-3xl">
      <Suspense fallback={<LoooxCircleContentSkeleton />}>
        <LoooxCircleData />
      </Suspense>
    </div>
  )
}
