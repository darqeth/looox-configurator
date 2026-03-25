import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import OrderDocument from '@/lib/pdf/order-document'
import type { ConfigOptions } from '@/lib/pdf/helpers'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  // Fetch order + config
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      quantity,
      unit_price,
      total_price,
      status,
      notes,
      created_at,
      configurations (
        id,
        name,
        article_number,
        width,
        height,
        selected_options
      )
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !order) return new NextResponse('Not found', { status: 404 })

  // Fetch dealer profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, company, phone, address')
    .eq('id', user.id)
    .single()

  const config = (Array.isArray(order.configurations)
    ? order.configurations[0]
    : order.configurations) as {
    id: string
    name: string | null
    article_number: string | null
    width: number | null
    height: number | null
    selected_options: ConfigOptions
  } | null

  const opts = (config?.selected_options ?? {}) as ConfigOptions

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(React.createElement(OrderDocument, {
    orderNumber: order.order_number,
    orderDate: order.created_at,
    articleNumber: config?.article_number,
    status: order.status,
    dealer: {
      name: profile?.full_name ?? null,
      company: profile?.company ?? null,
      email: user.email ?? '',
      phone: profile?.phone ?? null,
      address: profile?.address ?? null,
    },
    config: {
      name: config?.name ?? null,
      width: config?.width ?? null,
      height: config?.height ?? null,
      options: opts,
    },
    unitPrice: Number(order.unit_price),
    totalPrice: Number(order.total_price),
    quantity: order.quantity,
    notes: order.notes,
  }) as any) // eslint-disable-line @typescript-eslint/no-explicit-any

  const filename = `LoooX-Order-${order.order_number}.pdf`

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
    },
  })
}
