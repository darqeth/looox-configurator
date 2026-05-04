import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SidebarServer from '@/components/layout/sidebar-server'
import SidebarSkeleton from '@/components/layout/sidebar-skeleton'
import SupportButton from '@/components/support/support-button'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-lx-divider">
      <Suspense fallback={<SidebarSkeleton />}>
        <SidebarServer userId={user.id} />
      </Suspense>
      <main className="lg:ml-60 min-h-screen">
        {children}
      </main>
      <SupportButton />
    </div>
  )
}
