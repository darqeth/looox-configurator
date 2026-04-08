import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/sidebar'
import { fetchSidebarData } from '@/lib/sidebar-data'

export default async function ConfiguratiesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sidebar = await fetchSidebarData(supabase, user.id)

  return (
    <div className="min-h-screen bg-lx-divider">
      <Sidebar
        userName={sidebar.userName}
        company={sidebar.company}
        tier={sidebar.tier}
        configCount={sidebar.configCount}
        orderCount={sidebar.orderCount}
        isAdmin={sidebar.isAdmin}
        isManager={sidebar.isManager}
        canConfigure={sidebar.canConfigure}
        avatarUrl={sidebar.avatarUrl}
        pendingCount={sidebar.pendingCount}
        pendingColleaguesCount={sidebar.pendingColleaguesCount}
        closestMilestone={sidebar.closestMilestone}
      />
      <main className="lg:ml-60 min-h-screen">
        {children}
      </main>
    </div>
  )
}
