import { createAdminClient } from '@/lib/supabase/admin'
import { normaliseerBedrijf } from '@/lib/bedrijfsnaam'

// Zorgt dat een goedgekeurde gebruiker met een bedrijfsnaam (profiles.company)
// ook echt een bedrijf-entiteit + company_members-rij heeft. Idempotent: bestaat
// het lidmaatschap al, dan gebeurt er niets. Wordt gebruikt bij het inloggen én
// bij het goedkeuren door een (super)admin, zodat de eerste/enige persoon van een
// bedrijf direct koppelbaar is en er rechten ingesteld kunnen worden.
// Gebruikt de admin-client (bypass RLS) — alleen server-side aanroepen vanuit
// vertrouwde flows.
export async function ensureCompanyMembership(
  userId: string,
  // Net gelezen profiel van de aanroeper (inloggen); scheelt een extra query
  knownProfile?: { company: string | null; company_id: string | null },
): Promise<string | null> {
  const admin = createAdminClient()

  const profile = knownProfile ?? (await admin
    .from('profiles')
    .select('company, company_id')
    .eq('id', userId)
    .single()).data

  if (!profile?.company) return profile?.company_id ?? null

  const { data: existingMember } = await admin
    .from('company_members')
    .select('company_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (existingMember) return (existingMember.company_id as string | null) ?? profile.company_id ?? null

  // Prefer bestaand company_id; anders op naam (case-insensitive) om dubbele
  // bedrijven te vermijden; anders nieuw bedrijf aanmaken.
  let companyId: string | null = profile.company_id ?? null
  if (!companyId) {
    // Zelfde bedrijf, ook als het anders geschreven is (hoofdletters, spaties, B.V.).
    // De eerdere ilike + maybeSingle gaf niets terug zodra er twee bedrijven met die
    // naam waren, waarna er telkens nog een bij kwam.
    const norm = normaliseerBedrijf(profile.company)
    const { data: alle } = await admin.from('companies').select('id, name, created_at').order('created_at')
    const zelfde = norm ? (alle ?? []).filter((c) => normaliseerBedrijf(c.name as string) === norm) : []
    let bestaand: string | null = null
    if (zelfde.length === 1) bestaand = zelfde[0].id as string
    else if (zelfde.length > 1) {
      // Dubbelen uit het verleden: het bedrijf met de meeste leden, bij gelijk het oudste
      const { data: leden } = await admin.from('company_members').select('company_id').in('company_id', zelfde.map((c) => c.id as string))
      const aantal = (id: string) => (leden ?? []).filter((l) => l.company_id === id).length
      bestaand = [...zelfde].sort((a, b) => aantal(b.id as string) - aantal(a.id as string))[0].id as string
    }
    if (bestaand) {
      companyId = bestaand
    } else {
      const { data: newCompany } = await admin
        .from('companies')
        .insert({ name: profile.company.trim() })
        .select('id')
        .single()
      companyId = (newCompany?.id as string | undefined) ?? null
    }
  }

  if (companyId) {
    // Heeft het bedrijf al een manager, dan komt deze gebruiker er als gewone
    // collega bij; anders wordt hij de (eerste) manager.
    const { data: bestaandeManager } = await admin
      .from('company_members')
      .select('user_id')
      .eq('company_id', companyId)
      .eq('role', 'manager')
      .limit(1)
      .maybeSingle()

    // Alleen aanmaken, nooit overschrijven: hierboven is al vastgesteld dat er
    // geen lidmaatschap bestaat, en ingestelde rechten mogen niet veranderen.
    // (De eerdere upsert met onConflict 'user_id' mislukte altijd met HTTP 400,
    // omdat de unieke sleutel (company_id, user_id) is.)
    // De rechten zijn gelijk aan wat een account zonder lidmaatschap al mag.
    const [, { error: insertError }] = await Promise.all([
      admin.from('profiles').update({ company_id: companyId }).eq('id', userId),
      admin.from('company_members').insert({
        company_id: companyId,
        user_id: userId,
        role: bestaandeManager ? 'member' : 'manager',
        can_order: true,
        can_configure: true,
        own_configs_only: false,
        // Bestaand gedrag: wie zo aan een bedrijf wordt gekoppeld, ziet zijn inkoop
        can_see_purchase_prices: true,
      }),
    ])
    // 23505 = bestaat al (gelijktijdige login): prima, niets aan veranderen
    if (insertError && insertError.code !== '23505') {
      console.error('[ensure-company] lidmaatschap aanmaken mislukt', insertError.message)
    }
  }

  return companyId
}
