'use client'

import { useQuery } from '@tanstack/react-query'
import Sidebar from '@/components/layout/sidebar'
import SidebarSkeleton from '@/components/layout/sidebar-skeleton'
import { fetchSidebarQueryData } from '@/lib/queries/fetch-sidebar'

export function SidebarClient() {
  const { data, isLoading } = useQuery({
    queryKey: ['sidebar'],
    queryFn: fetchSidebarQueryData,
  })

  if (isLoading || !data) return <SidebarSkeleton />

  return (
    <Sidebar
      userName={data.userName}
      company={data.company}
      tier={data.tier}
      configCount={data.configCount}
      orderCount={data.orderCount}
      isAdmin={data.isAdmin}
      isSubAdmin={data.isSubAdmin}
      isManager={data.isManager}
      isInternational={data.isInternational}
      isGroothandel={data.isGroothandel}
      canConfigure={data.canConfigure}
      avatarUrl={data.avatarUrl}
      pendingCount={data.pendingCount}
      pendingColleaguesCount={data.pendingColleaguesCount}
      closestMilestone={data.closestMilestone}
      allMilestonesAchieved={data.allMilestonesAchieved}
    />
  )
}
