'use client'

import { useState, useTransition } from 'react'
import { updateOrderStatus, type OrderStatus } from '@/lib/actions/admin'
import { OrderDrawingsUploadModal } from './order-drawings-upload'
import { toast } from '@/components/toast'

export const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: 'pending',           label: 'In behandeling' },
  { value: 'confirmed',         label: 'Bevestigd' },
  { value: 'controle_vereist',  label: 'Controle vereist' },
  { value: 'goedgekeurd',       label: 'Goedgekeurd' },
  { value: 'afgekeurd',         label: 'Afgekeurd' },
  { value: 'in_production',     label: 'In productie' },
  { value: 'shipped',           label: 'Verzonden' },
  { value: 'delivered',         label: 'Geleverd' },
  { value: 'cancelled',         label: 'Geannuleerd' },
]

const STATUS_COLORS: Record<string, string> = {
  pending:          'bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA]',
  confirmed:        'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]',
  controle_vereist: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
  goedgekeurd:      'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]',
  afgekeurd:        'bg-red-50 text-red-600 border-red-200',
  in_production:    'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
  shipped:          'bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]',
  delivered:        'bg-[#F0F4F1] text-lx-cta border-[#A7C4B0]',
  cancelled:        'bg-red-50 text-red-600 border-red-200',
}

export function OrderStatusSelect({
  orderId,
  currentStatus,
}: {
  orderId: string
  currentStatus: string
}) {
  const [status, setStatus] = useState<string>(currentStatus)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleChange(newStatus: string) {
    if (newStatus === 'controle_vereist') {
      setShowUploadModal(true)
      return
    }
    const prev = status
    setStatus(newStatus)
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, newStatus as OrderStatus)
      if (!result.success) {
        // Rollback was stil (audit U8) — admin dacht dat het gelukt was
        setStatus(prev)
        toast(result.error ?? 'Status wijzigen mislukt. Probeer het opnieuw.')
      }
    })
  }

  const colorClass = STATUS_COLORS[status] ?? STATUS_COLORS.pending

  return (
    <>
      <div className="relative inline-block">
        <select
          value={status}
          onChange={e => handleChange(e.target.value)}
          disabled={isPending}
          className={`appearance-none text-[11.5px] font-semibold px-2.5 py-1 pr-6 rounded-lg border cursor-pointer transition-all disabled:opacity-60 focus:outline-none ${colorClass}`}
        >
          {ORDER_STATUSES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </div>

      {showUploadModal && (
        <OrderDrawingsUploadModal
          orderId={orderId}
          onSuccess={() => {
            setShowUploadModal(false)
            setStatus('controle_vereist')
          }}
          onCancel={() => setShowUploadModal(false)}
        />
      )}
    </>
  )
}
