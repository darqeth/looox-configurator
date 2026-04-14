import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildOrderPDFResponse } from '../_shared'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

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

  return buildOrderPDFResponse(supabase, user.id, user.email ?? '', order)
}
