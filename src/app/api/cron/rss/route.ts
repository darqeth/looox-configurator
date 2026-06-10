import { NextResponse } from 'next/server'
import { XMLParser } from 'fast-xml-parser'
import { createAdminClient } from '@/lib/supabase/admin'
import { timingSafeEqual } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a)
    const bufB = Buffer.from(b)
    return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`
  if (!safeCompare(authHeader, expected)) {
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

    // Upsert i.p.v. delete-then-insert (audit C13): faalt de insert, dan was
    // de cache anders 24 uur leeg. Admin-client: cron is een systeemtaak.
    const supabase = createAdminClient()
    const { error } = await supabase.from('rss_cache').upsert(items, { onConflict: 'url' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Verouderde items pas opruimen nadat de nieuwe set veilig staat
    const urls = items.map(i => i.url)
    if (urls.length > 0) {
      await supabase.from('rss_cache').delete().not('url', 'in', `(${urls.map(u => `"${u}"`).join(',')})`)
    }

    return NextResponse.json({ ok: true, count: items.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
