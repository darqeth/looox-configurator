import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildOrderPDFResponse } from '../../_shared'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  // RLS regelt toegang — geen user_id filter nodig voor collega-ondersteuning
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      id,
      user_id,
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
    .eq('configuration_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !order) return new NextResponse('Not found', { status: 404 })

  // De order kan van een collega of (voor admin) van een dealer zijn
  const bestellerId = (order as { user_id?: string }).user_id ?? user.id
  let bestellerEmail = user.email ?? ''
  if (bestellerId !== user.id) {
    const { data: besteller } = await supabase.from('profiles').select('email').eq('id', bestellerId).maybeSingle()
    bestellerEmail = besteller?.email ?? ''
  }

  return buildOrderPDFResponse(supabase, bestellerId, bestellerEmail, order)
}
