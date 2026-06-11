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
  // Lokale JWT-verificatie: shell rendert direct → alleen de content-skeleton
  // (geen route-skeleton meer die erdoor vervangen wordt)
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) redirect('/login')

  // Circle is verborgen voor 'alleen project' en internationale accounts —
  // dat moet ook gelden als iemand de URL direct intypt (besluit B4)
  const { data: profile } = await supabase
    .from('profiles')
    .select('configurator_access, is_international')
    .eq('id', userId)
    .single()
  if (profile?.configurator_access === 'project' || profile?.is_international) {
    redirect('/dashboard')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-3xl">
      <Suspense fallback={<LoooxCircleContentSkeleton />}>
        <LoooxCircleData />
      </Suspense>
    </div>
  )
}
