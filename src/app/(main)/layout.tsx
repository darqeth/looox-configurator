import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { SidebarClient } from '@/components/layout/sidebar-client'
import SidebarSkeleton from '@/components/layout/sidebar-skeleton'
import SupportButton from '@/components/support/support-button'
import { fetchSidebarData } from '@/lib/sidebar-data'

// Zijbalk-data in een eigen Suspense-blok: de layout wacht er niet meer op, dus
// de pagina-opbouw en skeletons gaan direct naar de browser en de zijbalk
// streamt erachteraan (performance-audit 2026-11, A1).
async function SidebarWithData({ userId }: { userId: string }) {
  // Vooraf-laden van menulinks (prefetch) heeft de zijbalk-data niet nodig: de
  // browser heeft die al, of haalt ze zelf op via de bestaande query. Zonder
  // deze check deed elke prefetch direct na het inloggen een eigen RPC.
  if ((await headers()).get('next-router-prefetch')) return <SidebarClient />

  const supabase = await createClient()
  const queryClient = new QueryClient()
  await queryClient.prefetchQuery({
    queryKey: ['sidebar'],
    queryFn: () => fetchSidebarData(supabase, userId),
  })
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SidebarClient />
    </HydrationBoundary>
  )
}

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  // Lokale JWT-verificatie — geen auth-roundtrip; middleware bewaakt de sessie al
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) redirect('/login')

  return (
    <div className="min-h-screen bg-lx-divider">
      <Suspense fallback={<SidebarSkeleton />}>
        <SidebarWithData userId={userId} />
      </Suspense>
      <main className="lg:ml-60 min-h-screen">
        {children}
      </main>
      <SupportButton />
    </div>
  )
}
