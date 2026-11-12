import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderProjectOrderPdf } from '@/lib/pdf/render-project-order'
import { pdfResponseHeaders } from '@/lib/pdf/render-offerte'
import { projectKop } from '@/lib/project'
import { leesMeubel } from '@/lib/meubel-opslag'

// Download van een projectorder als één PDF. RLS bepaalt wie de orderregels mag
// zien (besteller, manager binnen het bedrijf, admin); op de PDF staat de besteller.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ groep: string }> }) {
  const { groep } = await params
  if (!/^[A-Z]{3}-\d{4}-\d{1,8}$/.test(groep)) return new NextResponse('Not found', { status: 404 })
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: orders } = await supabase
    .from('orders')
    .select('id, user_id, order_number, quantity, unit_price, total_price, status, notes, created_at, configurations(id, name, article_number, width, height, total_price, status, selected_options)')
    .eq('order_group', groep)
    .order('order_number')
  if (!orders || orders.length === 0) return new NextResponse('Not found', { status: 404 })

  const bestellerId = orders[0].user_id as string
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, company, phone, address, shipping_address, korting')
    .eq('id', bestellerId)
    .maybeSingle()

  const regels = orders.flatMap((o) => {
    const config = (Array.isArray(o.configurations) ? o.configurations[0] : o.configurations) as {
      id: string; name: string | null; article_number: string | null; width: number | null; height: number | null
      total_price: number; status: string; selected_options: Record<string, unknown> | null
    } | null
    if (!config) return []
    const shape = (config.selected_options as { shape?: string } | null)?.shape
    // Dealerkorting alleen bij maatwerk spiegels; meubels en projectspiegels zijn netto geprijsd
    const netto = !!leesMeubel(config.selected_options) || shape === 'projectspiegel'
    return [{
      config,
      orderNumber: o.order_number as string,
      quantity: o.quantity as number,
      unitPrice: Number(o.unit_price),
      totalPrice: Number(o.total_price),
      korting: netto ? 0 : (profile?.korting ?? 50),
      status: o.status as string,
    }]
  })
  if (regels.length === 0) return new NextResponse('Not found', { status: 404 })

  const kop = projectKop(regels.map((r) => r.config))
  const altAdres = (regels[0].config.selected_options as { altShippingAddress?: string } | null)?.altShippingAddress
  const buffer = await renderProjectOrderPdf({
    groep,
    datum: orders[0].created_at as string,
    projectNaam: kop.naam,
    referentie: kop.referentie,
    notes: (orders[0].notes as string | null) ?? null,
    dealer: {
      name: profile?.full_name ?? null,
      company: profile?.company ?? null,
      email: profile?.email ?? (bestellerId === user.id ? user.email ?? '' : ''),
      phone: profile?.phone ?? null,
      address: profile?.address ?? null,
      shippingAddress: altAdres ?? profile?.shipping_address ?? null,
    },
    regels,
  })

  return new NextResponse(new Uint8Array(buffer), { status: 200, headers: pdfResponseHeaders(`LoooX-Order-${groep}.pdf`, buffer.length) })
}
