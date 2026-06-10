import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { SidebarClient } from '@/components/layout/sidebar-client'
import SupportButton from '@/components/support/support-button'
import { fetchSidebarData } from '@/lib/sidebar-data'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  // Lokale JWT-verificatie — geen auth-roundtrip; middleware bewaakt de sessie al
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) redirect('/login')

  const queryClient = new QueryClient()
  await queryClient.prefetchQuery({
    queryKey: ['sidebar'],
    queryFn: () => fetchSidebarData(supabase, userId),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="min-h-screen bg-lx-divider">
        <SidebarClient />
        <main className="lg:ml-60 min-h-screen">
          {children}
        </main>
        <SupportButton />
      </div>
    </HydrationBoundary>
  )
}
