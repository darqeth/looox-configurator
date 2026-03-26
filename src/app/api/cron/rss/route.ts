import { NextResponse } from 'next/server'
import { XMLParser } from 'fast-xml-parser'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const feedUrl = process.env.RSS_FEED_URL
  if (!feedUrl) return NextResponse.json({ error: 'RSS_FEED_URL niet ingesteld' }, { status: 500 })

  try {
    const res = await fetch(feedUrl, { next: { revalidate: 0 } })
    if (!res.ok) return NextResponse.json({ error: `Feed ophalen mislukt: ${res.status}` }, { status: 500 })

    const xml = await res.text()
    const parser = new XMLParser({ ignoreAttributes: false })
    const parsed = parser.parse(xml)

    // Format: <urlset><resource><id/><url/><pagetitle/><date/><image/></resource></urlset>
    const rawItems = parsed?.urlset?.resource ?? []
    const resources = Array.isArray(rawItems) ? rawItems : [rawItems]

    const items = resources
      .filter((r: Record<string, unknown>) => r.url && r.pagetitle)
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
        new Date(String(b.date)).getTime() - new Date(String(a.date)).getTime()
      )
      .slice(0, 10)
      .map((r: Record<string, unknown>) => ({
        title: String(r.pagetitle),
        url: String(r.url),
        summary: '',
        image_url: r.image ? String(r.image) : null,
        published_at: r.date ? new Date(String(r.date)).toISOString() : new Date().toISOString(),
      }))

    const supabase = await createClient()
    await supabase.from('rss_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const { error } = await supabase.from('rss_cache').insert(items)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, count: items.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
