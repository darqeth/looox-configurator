import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { TabNav } from './tab-nav'
import { AccountContent, AccountContentSkeleton } from './account-content'

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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
        <AccountContent userId={user.id} userEmail={user.email ?? ''} />
      </Suspense>

    </div>
  )
}
