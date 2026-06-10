import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { TabNav } from './tab-nav'
import { AccountContent, AccountContentSkeleton } from './account-content'

export default async function AccountPage() {
  const supabase = await createClient()
  // Lokale JWT-verificatie: shell (tabs + kop) rendert direct → alleen de
  // content-skeleton (geen route-skeleton meer die erdoor vervangen wordt)
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  const userEmail = (claimsData?.claims?.email as string | undefined) ?? ''
  if (!userId) redirect('/login')

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-3xl">

      {/* TabNav + header — rendert direct */}
      <TabNav active="profiel" />
      <div className="mb-6">
        <h1 className="text-[20px] font-bold text-lx-text-primary tracking-tight">Mijn account</h1>
        <p className="text-[13px] text-lx-text-secondary mt-0.5">Beheer je profielgegevens en beveiliging</p>
      </div>

      {/* Content — streamt zodra DB queries klaar zijn */}
      <Suspense fallback={<AccountContentSkeleton />}>
        <AccountContent userId={userId} userEmail={userEmail} />
      </Suspense>

    </div>
  )
}
