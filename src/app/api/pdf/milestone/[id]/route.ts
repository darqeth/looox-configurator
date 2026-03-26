import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import React from 'react'
import MilestoneDocument from '@/lib/pdf/milestone-document'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  // Haal user_milestone op
  const { data: um, error } = await supabase
    .from('user_milestones')
    .select('id, user_id, achieved_at, claimed_at, milestone_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !um) return new NextResponse('Not found', { status: 404 })

  // Haal milestone details op
  const { data: milestone } = await supabase
    .from('milestones')
    .select('title, benefit_description')
    .eq('id', um.milestone_id)
    .single()

  // Haal dealerprofiel op
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, company')
    .eq('id', user.id)
    .single()

  // Markeer als geclaimd indien nog niet gedaan
  if (!um.claimed_at) {
    await supabase
      .from('user_milestones')
      .update({ claimed_at: new Date().toISOString() })
      .eq('id', id)
  }

  const buffer = await renderToBuffer(React.createElement(MilestoneDocument, {
    milestoneTitle: milestone?.title ?? 'Voordeel',
    benefitDescription: milestone?.benefit_description ?? '',
    dealerName: profile?.full_name ?? null,
    company: profile?.company ?? null,
    achievedAt: um.achieved_at ?? new Date().toISOString(),
  }) as React.ReactElement<DocumentProps>)

  const safeTitle = (milestone?.title ?? 'voordeel').replace(/[^a-z0-9]/gi, '-').toLowerCase()
  const filename = `LoooX-Circle-${safeTitle}.pdf`

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Content-Length': buffer.length.toString(),
    },
  })
}
