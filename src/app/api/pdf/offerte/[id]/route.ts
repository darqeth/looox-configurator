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

  // Fetch configuration — RLS regelt toegang (eigen configs + bedrijfscollega's)
  const { data: config, error } = await supabase
    .from('configurations')
    .select('id, name, article_number, width, height, total_price, selected_options, created_at')
    .eq('id', id)
    .single()

  if (error || !config) return new NextResponse('Not found', { status: 404 })

  // Fetch dealer profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, company, phone, address, shipping_address')
    .eq('id', user.id)
    .single()

  // Aangevinkt sfeerbeeld voor deze configuratie (besluit V3, exclusief)
  const { data: viz } = await supabase
    .from('visualisations')
    .select('image_path')
    .eq('configuration_id', id)
    .eq('in_pdf', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const visualisationUrl = viz?.image_path
    ? supabase.storage.from('visualisations').getPublicUrl(viz.image_path).data.publicUrl
    : null

  const opts = (config.selected_options ?? {}) as ConfigOptions
  const quantity = (opts.quantity as number | undefined) ?? 1
  const totalPrice = Number(config.total_price)
  // Projectspiegels: total_price is al het totaal voor alle stuks; stuksprijs terugrekenen
  const isProjectspiegel = (opts.shape as string | undefined) === 'projectspiegel'
  const unitPrice = isProjectspiegel && quantity > 1
    ? Math.round((totalPrice / quantity) * 100) / 100
    : totalPrice
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
      shippingAddress: (profile as { shipping_address?: string | null } | null)?.shipping_address ?? null,
    },
    config: {
      width: config.width,
      height: config.height,
      options: opts,
    },
    unitPrice,
    quantity,
    attachmentUrl,
    visualisationUrl,
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
