import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOfferteDealer, pdfResponseHeaders, renderOfferteBuffer } from '@/lib/pdf/render-offerte'

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

  const dealer = await getOfferteDealer(supabase, user.id, user.email ?? '')
  const buffer = await renderOfferteBuffer(supabase, config, dealer)

  const safeName = (config.name ?? 'offerte').replace(/[^a-z0-9\-_]/gi, '-')
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: pdfResponseHeaders(`LoooX-Offerte-${safeName}.pdf`, buffer.length),
  })
}
