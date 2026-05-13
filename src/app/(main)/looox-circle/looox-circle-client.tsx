'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchLoooxCircle } from '@/lib/queries/fetch-looox-circle'
import { LoooxCircleContent, LoooxCircleContentSkeleton } from './looox-circle-content'

export function LoooxCircleClient() {
  const { data } = useQuery({
    queryKey: ['looox-circle'],
    queryFn: fetchLoooxCircle,
  })

  if (!data) return <LoooxCircleContentSkeleton />
  return <LoooxCircleContent data={data} />
}
