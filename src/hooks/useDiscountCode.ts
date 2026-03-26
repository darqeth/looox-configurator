'use client'

import { useState } from 'react'
import { validateDiscountCode } from '@/lib/actions/milestones'

export type AppliedDiscount = {
  id: string
  type: 'pct' | 'fixed'
  value: number
  useType: 'single' | 'per_user'
  code: string
}

export function useDiscountCode(subtotal: number) {
  const [input, setInput] = useState('')
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState('')
  const [applied, setApplied] = useState<AppliedDiscount | null>(null)

  const discountAmount = applied
    ? (applied.type === 'pct'
        ? Math.round(subtotal * applied.value / 100)
        : Math.min(applied.value, subtotal))
    : 0

  async function validate() {
    setError('')
    setValidating(true)
    try {
      const res = await validateDiscountCode(input)
      if (res.valid && res.id && res.type && res.value !== undefined) {
        setApplied({
          id: res.id,
          type: res.type,
          value: res.value,
          useType: res.use_type ?? 'single',
          code: input.toUpperCase().trim(),
        })
      } else {
        setError(res.error ?? 'Ongeldige code')
      }
    } catch {
      setError('Verbindingsfout, probeer opnieuw')
    } finally {
      setValidating(false)
    }
  }

  function reset() {
    setInput('')
    setError('')
    setApplied(null)
    setValidating(false)
  }

  return { input, setInput, validating, error, setError, applied, setApplied, discountAmount, validate, reset }
}
