import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { renderOrderPDF } from '@/lib/pdf/render-order'
import type { ConfigOptions } from '@/lib/pdf/helpers'

type OrderRow = {
  order_number: string
  quantity: number
  unit_price: string | number
  total_price: string | number
  status: string
  notes: string | null
  created_at: string
  configurations: unknown
}

type ConfigRow = {
  id: string
  name: string | null
  article_number: string | null
  width: number | null
  height: number | null
  selected_options: ConfigOptions
}

export async function buildOrderPDFResponse(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string,
  order: OrderRow
): Promise<NextResponse> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, company, phone, address, korting')
    .eq('id', userId)
    .single()

  const config = (Array.isArray(order.configurations)
    ? order.configurations[0]
    : order.configurations) as ConfigRow | null

  if (!config) return new NextResponse('Configuratie niet gevonden', { status: 404 })

  const opts = (config.selected_options ?? {}) as ConfigOptions

  const buffer = await renderOrderPDF({
    orderNumber: order.order_number,
    orderDate: order.created_at,
    articleNumber: config.article_number,
    status: order.status,
    dealer: {
      name: profile?.full_name ?? null,
      company: profile?.company ?? null,
      email: userEmail,
      phone: profile?.phone ?? null,
      address: profile?.address ?? null,
    },
    config: {
      name: config.name ?? null,
      width: config.width ?? null,
      height: config.height ?? null,
      options: opts,
    },
    unitPrice: Number(order.unit_price),
    korting: profile?.korting ?? 50,
    quantity: order.quantity,
    notes: order.notes,
    attachmentUrl: (opts.attachmentUrl as string | null) ?? null,
  })

  const filename = `LoooX-Order-${order.order_number}.pdf`

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Content-Length': buffer.length.toString(),
    },
  })
}
