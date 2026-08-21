import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const SHAPE_LABELS: Record<string, string> = {
  rechthoek: 'Rechthoek',
  rond: 'Rond',
  organic: 'Organic',
  'rounded-rect': 'Afgerond',
  ovaal: 'Ovaal',
  elips: 'Ellips',
  arc: 'Boog',
  'op-aanvraag': 'Op aanvraag',
}

function shapeLabel(slug: string): string {
  return SHAPE_LABELS[slug] ?? slug
}

function dims(w: number | null, h: number | null, opts: Record<string, unknown>): string {
  if (opts?.shape === 'rond') return `⌀ ${(opts.diameter as number) ?? '?'} cm`
  if (w && h) return `${w} × ${h} cm`
  return ''
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') ?? '').trim()
  if (q.length < 2) return NextResponse.json({ configs: [], orders: [] })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ configs: [], orders: [] }, { status: 401 })

  const safe = q.replace(/[%_]/g, '\\$&')

  // 1. Configuraties: zoek op naam of vorm
  const [configsRes, ordersByFieldRes] = await Promise.all([
    supabase
      .from('configurations')
      .select('id, name, width, height, selected_options, updated_at')
      .eq('user_id', user.id)
      .or(`name.ilike.%${safe}%,selected_options->>shape.ilike.%${safe}%`)
      .order('updated_at', { ascending: false })
      .limit(5),

    // 2. Bestellingen: zoek op ordernummer of bijzonderheden
    supabase
      .from('orders')
      .select(`id, order_number, quantity, total_price, status, notes, created_at,
        configurations (id, name, width, height, selected_options)`)
      .eq('user_id', user.id)
      .or(`order_number.ilike.%${safe}%,notes.ilike.%${safe}%`)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // 3. Bestellingen via projectnaam config-match
  let ordersByConfigRes: typeof ordersByFieldRes = { data: [], error: null, count: null, status: 200, statusText: 'OK' }
  if (configsRes.data?.length) {
    const configIds = configsRes.data.map(c => c.id)
    const res = await supabase
      .from('orders')
      .select(`id, order_number, quantity, total_price, status, notes, created_at,
        configurations (id, name, width, height, selected_options)`)
      .eq('user_id', user.id)
      .in('configuration_id', configIds)
      .order('created_at', { ascending: false })
      .limit(5)
    ordersByConfigRes = res
  }

  // Merge orders, deduplicate
  const allOrders = [
    ...(ordersByFieldRes.data ?? []),
    ...(ordersByConfigRes.data ?? []),
  ]
  const seenOrderIds = new Set<string>()
  const orders = allOrders.filter(o => {
    if (seenOrderIds.has(o.id)) return false
    seenOrderIds.add(o.id)
    return true
  }).slice(0, 6)

  const configResults = (configsRes.data ?? []).map(c => {
    const opts = (c.selected_options ?? {}) as Record<string, unknown>
    const shape = (opts.shape as string) ?? 'rechthoek'
    return {
      id: c.id,
      name: c.name ?? '(naamloos)',
      shape: shapeLabel(shape),
      dims: dims(c.width, c.height, opts),
      href: `/configurator/${c.id}`,
    }
  })

  const STATUS_LABELS: Record<string, string> = {
    pending: 'In behandeling', confirmed: 'Bevestigd', shipped: 'Verzonden',
    delivered: 'Geleverd', cancelled: 'Geannuleerd',
  }

  const orderResults = orders.map(o => {
    const config = (Array.isArray(o.configurations) ? o.configurations[0] : o.configurations) as
      { id: string; name: string | null; width: number | null; height: number | null; selected_options: Record<string, unknown> } | null
    const opts = (config?.selected_options ?? {}) as Record<string, unknown>
    return {
      id: o.id,
      orderNumber: o.order_number,
      configName: config?.name ?? '—',
      shape: shapeLabel((opts.shape as string) ?? 'rechthoek'),
      dims: dims(config?.width ?? null, config?.height ?? null, opts),
      status: STATUS_LABELS[o.status] ?? o.status,
      href: '/bestellingen',
    }
  })

  return NextResponse.json({ configs: configResults, orders: orderResults })
}
