import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import React from 'react'
import OfferteDocument from '@/lib/pdf/offerte-document'
import type { ConfigOptions } from '@/lib/pdf/helpers'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  // Fetch configuration
  const { data: config, error } = await supabase
    .from('configurations')
    .select('id, name, article_number, width, height, total_price, selected_options, created_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !config) return new NextResponse('Not found', { status: 404 })

  // Fetch dealer profile (met price factor)
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, company, phone, address, price_factor, price_factor_enabled')
    .eq('id', user.id)
    .single()

  const opts = (config.selected_options ?? {}) as ConfigOptions
  const quantity = (opts.quantity as number | undefined) ?? 1
  const unitPrice = Number(config.total_price) // total_price stores the per-unit price
  const totalPrice = unitPrice * quantity

  const priceFactor = Number(profile?.price_factor ?? 1)
  // Offerte toont altijd consumentenprijs als factor > 1 (ongeacht toggle)
  const priceFactorEnabled = priceFactor > 1
  const attachmentUrl = (opts.attachmentUrl as string | null) ?? null

  const buffer = await renderToBuffer(React.createElement(OfferteDocument, {
    configName: config.name,
    configDate: config.created_at,
    articleNumber: config.article_number,
    dealer: {
      name: profile?.full_name ?? null,
      company: profile?.company ?? null,
      email: user.email ?? '',
      phone: profile?.phone ?? null,
      address: profile?.address ?? null,
    },
    config: {
      width: config.width,
      height: config.height,
      options: opts,
    },
    unitPrice,
    totalPrice,
    quantity,
    priceFactor,
    priceFactorEnabled,
    attachmentUrl,
  }) as React.ReactElement<DocumentProps>)

  const safeName = (config.name ?? 'offerte').replace(/[^a-z0-9\-_]/gi, '-')
  const filename = `LoooX-Offerte-${safeName}.pdf`

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Content-Length': buffer.length.toString(),
    },
  })
}
