'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,
        gcTime: 30 * 60 * 1000,
        retry: 1,
      },
    },
  }))

  useEffect(() => {
    const key = 'lx_cache_date'
    const today = new Date().toDateString()
    const last = localStorage.getItem(key)
    if (last !== null && last !== today) {
      // Alleen invalideren als er een vorige dag was — niet bij eerste run
      queryClient.invalidateQueries()
    }
    localStorage.setItem(key, today)
  }, [queryClient])

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
