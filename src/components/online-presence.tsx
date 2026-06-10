'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Live "wie is er online" via Supabase Realtime Presence — geen database-
// writes of polling. Elke ingelogde gebruiker joint het kanaal (tracker,
// onzichtbaar, gemount in de sidebar); admins/beheerders zien daarnaast de
// teller-badge. Alleen niet-staf telt mee. Presence-key = user-id, dus
// meerdere tabbladen van dezelfde gebruiker tellen als één.

export function OnlinePresence({
  isStaff,
  showBadge = false,
}: {
  isStaff: boolean
  showBadge?: boolean
}) {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled || !session?.user) return
      channel = supabase.channel('online-users', {
        config: { presence: { key: session.user.id } },
      })
      channel
        .on('presence', { event: 'sync' }, () => {
          if (!showBadge || !channel) return
          const state = channel.presenceState<{ staff: boolean }>()
          const online = Object.values(state).filter((metas) => !metas[0]?.staff).length
          setCount(online)
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel?.track({ staff: isStaff })
          }
        })
    })

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!showBadge) return null

  const online = count ?? 0
  return (
    <div
      title={`${online} gebruiker${online === 1 ? '' : 's'} online (excl. beheerders)`}
      className="flex items-center gap-2 h-9 px-3 rounded-xl bg-white border border-black/6 shadow-sm select-none"
    >
      <span className="relative flex h-2.5 w-2.5">
        {online > 0 && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-60 animate-ping [animation-duration:2.5s]" />
        )}
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full transition-colors ${
            online > 0 ? 'bg-green-500' : 'bg-gray-300'
          }`}
        />
      </span>
      <span className="text-[12.5px] font-semibold text-lx-text-primary tabular-nums">{online}</span>
      <span className="text-[12px] text-lx-text-secondary hidden sm:inline">online</span>
    </div>
  )
}
