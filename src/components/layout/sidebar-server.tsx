import { createClient } from '@/lib/supabase/server'
import { fetchSidebarData } from '@/lib/sidebar-data'
import Sidebar from '@/components/layout/sidebar'

export default async function SidebarServer({ userId }: { userId: string }) {
  const supabase = await createClient()
  const sidebar = await fetchSidebarData(supabase, userId)

  return (
    <Sidebar
      userName={sidebar.userName}
      company={sidebar.company}
      tier={sidebar.tier}
      configCount={sidebar.configCount}
      orderCount={sidebar.orderCount}
      isAdmin={sidebar.isAdmin}
      isSubAdmin={sidebar.isSubAdmin}
      isManager={sidebar.isManager}
      isInternational={sidebar.isInternational}
      isGroothandel={sidebar.isGroothandel}
      canConfigure={sidebar.canConfigure}
      avatarUrl={sidebar.avatarUrl}
      pendingCount={sidebar.pendingCount}
      pendingColleaguesCount={sidebar.pendingColleaguesCount}
      closestMilestone={sidebar.closestMilestone}
      allMilestonesAchieved={sidebar.allMilestonesAchieved}
    />
  )
}
