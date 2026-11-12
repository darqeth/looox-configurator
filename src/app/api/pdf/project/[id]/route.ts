import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { getOfferteDealer, pdfResponseHeaders, renderOfferteBuffer } from '@/lib/pdf/render-offerte'
import ProjectVoorblad from '@/lib/pdf/project-voorblad'
import { voegPdfsSamen } from '@/lib/pdf/samenvoegen'
import { isUuid, projectKop, projectRegel } from '@/lib/project'

// Projectofferte: voorblad met alle regels en het totaal, daarna de bestaande
// offerte per regel. RLS bepaalt welke regels de aanroeper mag zien.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) return new NextResponse('Not found', { status: 404 })
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: configs } = await supabase
    .from('configurations')
    .select('id, name, article_number, width, height, total_price, status, selected_options, created_at')
    .eq('project_id', id)
    .in('status', ['saved', 'ordered'])
    .order('created_at')
  if (!configs || configs.length === 0) return new NextResponse('Not found', { status: 404 })

  const dealer = await getOfferteDealer(supabase, user.id, user.email ?? '')
  const kop = projectKop(configs)

  const voorblad = await renderToBuffer(React.createElement(ProjectVoorblad, {
    variant: 'offerte',
    projectNaam: kop.naam,
    referentie: kop.referentie,
    datum: new Date().toISOString(),
    dealer,
    regels: configs.map(projectRegel),
  }) as React.ReactElement<DocumentProps>)

  // Na elkaar in plaats van tegelijk: react-pdf en sharp gebruiken veel geheugen per document
  const perRegel: Buffer[] = []
  for (const config of configs) perRegel.push(await renderOfferteBuffer(supabase, config, dealer))

  const buffer = await voegPdfsSamen([voorblad, ...perRegel])
  const safeName = kop.naam.replace(/[^a-z0-9\-_]/gi, '-')
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: pdfResponseHeaders(`LoooX-Offerte-${safeName}.pdf`, buffer.length),
  })
}
