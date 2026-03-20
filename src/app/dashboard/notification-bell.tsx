'use client'

import { useState, useRef, useEffect, useTransition, useCallback } from 'react'
import { markAllNotificationsRead } from '@/lib/actions/notifications'

type Notification = {
  id: string
  title: string
  body: string | null
  type: string
  published_at: string
}

const TYPE_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  feature: { label: 'Nieuw', color: 'border-lx-cta bg-lx-icon-bg', dot: 'bg-lx-cta' },
  promo:   { label: 'Actie', color: 'border-amber-400 bg-amber-50',  dot: 'bg-amber-400' },
  info:    { label: 'Info',  color: 'border-blue-400 bg-blue-50',    dot: 'bg-blue-400' },
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m geleden`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}u geleden`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d geleden`
  return new Date(dateStr).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

// Measures whether a text element is actually clamped (overflows its visible area).
// Used to decide whether the "Lees meer" toggle is worth showing.
function useIsClamped(body: string | null) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [isClamped, setIsClamped] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    setIsClamped(el.scrollHeight > el.clientHeight)
  }, [body])

  return { ref, isClamped }
}

interface NotificationRowProps {
  n: Notification
  isUnread: boolean
  isExpanded: boolean
  onToggle: (id: string) => void
}

function NotificationRow({ n, isUnread, isExpanded, onToggle }: NotificationRowProps) {
  const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.info
  const { ref: clampRef, isClamped } = useIsClamped(n.body)

  return (
    <div
      className={`flex gap-3 px-4 py-3.5 transition-colors ${isUnread ? 'bg-lx-panel-bg/60' : 'bg-white'}`}
    >
      {/* Gekleurde dot */}
      <div className="mt-1.5 flex-shrink-0">
        <span className={`block w-2 h-2 rounded-full ${isUnread ? cfg.dot : 'bg-black/15'}`} />
      </div>

      <div className="min-w-0 flex-1">
        {/* Titel + type badge */}
        <div className="flex items-start justify-between gap-2">
          <p className={`text-[13px] font-semibold leading-snug ${isUnread ? 'text-lx-text-primary' : 'text-lx-text-secondary'}`}>
            {n.title}
          </p>
          <span className={`flex-shrink-0 text-[9.5px] font-bold px-1.5 py-0.5 rounded-md border ${cfg.color}`}>
            {cfg.label}
          </span>
        </div>

        {/* Body — clamped by default, expand on toggle */}
        {n.body && (
          <div>
            <p
              ref={clampRef}
              className={`text-[11.5px] text-lx-text-secondary mt-0.5 leading-relaxed transition-all duration-200 ${
                isExpanded ? '' : 'line-clamp-2'
              }`}
            >
              {n.body}
            </p>

            {/* Only render the toggle when text is actually truncated, or when expanded */}
            {(isClamped || isExpanded) && (
              <button
                onClick={() => onToggle(n.id)}
                className="mt-1 text-[10.5px] font-medium text-lx-cta hover:underline focus:outline-none transition-colors"
              >
                {isExpanded ? 'Minder' : 'Lees meer'}
              </button>
            )}
          </div>
        )}

        <p className="text-[10.5px] text-lx-placeholder mt-1">{timeAgo(n.published_at)}</p>
      </div>
    </div>
  )
}

interface NotificationBellProps {
  notifications: Notification[]
  readAt: string | null
}

export default function NotificationBell({ notifications, readAt }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const [localReadAt, setLocalReadAt] = useState(readAt)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const panelRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const unreadCount = notifications.filter((n) =>
    !localReadAt || new Date(n.published_at) > new Date(localReadAt)
  ).length

  // Sluit dropdown bij klik buiten
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Sluit expanded row wanneer dropdown sluit
  useEffect(() => {
    if (!open) setExpandedId(null)
  }, [open])

  function handleReadAll() {
    const now = new Date().toISOString()
    setLocalReadAt(now) // optimistisch
    startTransition(() => markAllNotificationsRead())
  }

  const handleToggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 rounded-xl bg-white border border-black/8 shadow-sm flex items-center justify-center text-lx-text-secondary hover:text-lx-text-primary transition-colors"
        aria-label="Meldingen"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-11 w-80 bg-white rounded-2xl border border-black/8 shadow-xl z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-lx-divider">
            <div className="flex items-center gap-2">
              <span className="text-[13.5px] font-semibold text-lx-text-primary">Meldingen</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full">
                  {unreadCount} nieuw
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleReadAll}
                disabled={isPending}
                className="text-[11.5px] text-lx-cta font-medium hover:text-lx-cta-hover disabled:opacity-50 transition-colors"
              >
                Alles gelezen
              </button>
            )}
          </div>

          {/* Lijst */}
          <div className="max-h-96 overflow-y-auto divide-y divide-lx-divider">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[13px] text-lx-text-secondary">Geen meldingen</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !localReadAt || new Date(n.published_at) > new Date(localReadAt)
                return (
                  <NotificationRow
                    key={n.id}
                    n={n}
                    isUnread={isUnread}
                    isExpanded={expandedId === n.id}
                    onToggle={handleToggle}
                  />
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
