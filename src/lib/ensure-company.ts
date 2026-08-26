import { createAdminClient } from '@/lib/supabase/admin'

// Zorgt dat een goedgekeurde gebruiker met een bedrijfsnaam (profiles.company)
// ook echt een bedrijf-entiteit + company_members-rij heeft. Idempotent: bestaat
// het lidmaatschap al, dan gebeurt er niets. Wordt gebruikt bij het inloggen én
// bij het goedkeuren door een (super)admin, zodat de eerste/enige persoon van een
// bedrijf direct koppelbaar is en er rechten ingesteld kunnen worden.
// Gebruikt de admin-client (bypass RLS) — alleen server-side aanroepen vanuit
// vertrouwde flows.
export async function ensureCompanyMembership(userId: string): Promise<string | null> {
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('company, company_id')
    .eq('id', userId)
    .single()

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
    const { data: existingCompany } = await admin
      .from('companies')
      .select('id')
      .ilike('name', profile.company)
      .maybeSingle()
    if (existingCompany) {
      companyId = existingCompany.id as string
    } else {
      const { data: newCompany } = await admin
        .from('companies')
        .insert({ name: profile.company })
        .select('id')
        .single()
      companyId = (newCompany?.id as string | undefined) ?? null
    }
  }

  if (companyId) {
    await Promise.all([
      admin.from('profiles').update({ company_id: companyId }).eq('id', userId),
      admin.from('company_members').upsert({
        company_id: companyId,
        user_id: userId,
        role: 'manager',
        can_order: true,
        can_configure: true,
        own_configs_only: false,
      }, { onConflict: 'user_id' }),
    ])
  }

  return companyId
}
