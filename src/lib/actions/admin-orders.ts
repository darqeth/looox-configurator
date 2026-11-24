'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminOrSubAdmin } from '@/lib/company-utils'
import { berekenProjectOrderRegel } from '@/lib/project-order'
import { groothandelPatch, kiesGroothandelRegels } from '@/lib/groothandel-order'

// ─── Op besteld zetten via de groothandel ────────────────────────────────────
// De dealer heeft bij de groothandel besteld en dus niet in de configurator. Het
// beheer maakt de order alsnog aan, op naam van de dealer, zodat statussen,
// tekeningen ter goedkeuring en de PDF's werken zoals bij elke andere order.
//
// Prijzen: dezelfde functie als bij bestellen door de dealer (berekenProjectOrderRegel),
// met de korting van de dealer en het aantal van de offerte. Geen kortingscode.
// Nummering: dezelfde tellers (next_order_number / next_offerte_number).
// Er gaat GEEN orderbevestiging uit, niet naar de dealer en niet naar LoooX.
//
// create_order_atomic en create_project_order_atomic zetten de order op naam van
// de aanroeper (auth.uid()) en zijn hier dus niet bruikbaar. Na de rechtencheck
// schrijft de service-role client de order op naam van de dealer; mislukt het
// aanmaken, dan gaan de configuraties terug naar opgeslagen.

const invoerSchema = z.object({
  configId: z.string().uuid(),
  referentie: z.string().trim().max(200),
  notes: z.string().trim().max(5000),
})

type Resultaat =
  | { success: true; orderNumber: string; aantalRegels: number; isOfferte: boolean }
  | { success: false; error: string }

const CONFIG_KOLOMMEN = 'id, name, article_number, width, height, total_price, status, selected_options, user_id, project_id, created_at'

type ConfigRij = {
  id: string
  name: string | null
  article_number: string | null
  width: number | null
  height: number | null
  total_price: number | string
  status: string
  selected_options: Record<string, unknown> | null
  user_id: string
  project_id: string | null
  created_at: string
}

export async function zetOpBesteldViaGroothandel(
  rawConfigId: string,
  rawInvoer: { referentie?: string; notes?: string },
): Promise<Resultaat> {
  const parsed = invoerSchema.safeParse({ configId: rawConfigId, referentie: rawInvoer?.referentie ?? '', notes: rawInvoer?.notes ?? '' })
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Ongeldige invoer' }
  const { configId, referentie, notes } = parsed.data

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !await isAdminOrSubAdmin(supabase, user.id)) return { success: false, error: 'Geen toegang' }

  // Lezen met de eigen sessie: wat de beheerder niet mag zien, kan hij ook niet bestellen
  const { data: config } = await supabase.from('configurations').select(CONFIG_KOLOMMEN).eq('id', configId).maybeSingle<ConfigRij>()
  if (!config) return { success: false, error: 'Configuratie niet gevonden' }

  let projectRegels: ConfigRij[] = []
  if (config.project_id) {
    const { data } = await supabase.from('configurations').select(CONFIG_KOLOMMEN).eq('project_id', config.project_id).order('created_at').returns<ConfigRij[]>()
    projectRegels = data ?? []
  }
  const keuze = kiesGroothandelRegels(config, projectRegels)
  if ('fout' in keuze) return { success: false, error: keuze.fout }
  const configs = keuze.regels
  const configIds = configs.map((c) => c.id)

  // De order komt op naam van de eigenaar van de configuratie; bij een project die van de oudste regel
  const eigenaarId = configs[0].user_id
  const admin = createAdminClient()

  const { data: bestaand } = await admin.from('orders').select('id').in('configuration_id', configIds).limit(1)
  if (bestaand && bestaand.length > 0) return { success: false, error: 'Voor deze configuratie bestaat al een bestelling' }

  const { data: eigenaar } = await admin.from('profiles').select('korting').eq('id', eigenaarId).maybeSingle()
  if (!eigenaar) return { success: false, error: 'De dealer van deze configuratie bestaat niet meer' }
  const dealerKortingPct = eigenaar.korting ?? 50

  // Blokkades die voor de dealer bedoeld zijn (nalopen, tekening) gelden hier niet; een ontbrekende prijs wel
  const regels = configs.map((c) => berekenProjectOrderRegel(c, dealerKortingPct, { zonderDealerBlokkades: true }))
  const fout = regels.find((r) => r.fout)?.fout
  if (fout) return { success: false, error: fout }

  const isOfferte = regels.every((r) => r.regel.opAanvraag)
  const isProject = !!config.project_id
  const nu = new Date().toISOString()

  // Stap 1: configuraties op besteld, met de markering en de toegepaste staffel
  const gezet: ConfigRij[] = []
  const terugdraaien = async () => {
    for (const c of gezet) {
      await admin.from('configurations').update({ status: 'saved', selected_options: c.selected_options }).eq('id', c.id).eq('status', 'ordered')
    }
  }
  for (const [i, c] of configs.entries()) {
    const patch = groothandelPatch({ door: user.id, op: nu, referentie, staffelPct: regels[i].staffelPct })
    const { data, error } = await admin.from('configurations')
      .update({ status: 'ordered', selected_options: { ...(c.selected_options ?? {}), ...patch } })
      .eq('id', c.id)
      .eq('status', 'saved')
      .select('id')
    if (error || !data || data.length === 0) {
      await terugdraaien()
      return { success: false, error: error?.message ?? 'Een regel is intussen gewijzigd of al besteld. Ververs de pagina.' }
    }
    gezet.push(c)
  }

  // Stap 2: order(s) aanmaken, opnieuw proberen als het nummer al bestaat
  let nummer = ''
  let aangemaakt = false
  let laatsteFout = 'Bestelling aanmaken mislukt'
  for (let poging = 0; poging < 5 && !aangemaakt; poging++) {
    const { data: volgend, error: nummerFout } = await admin.rpc(isOfferte ? 'next_offerte_number' : 'next_order_number')
    if (nummerFout || typeof volgend !== 'string' || !volgend) {
      laatsteFout = nummerFout?.message ?? 'Geen ordernummer gekregen'
      break
    }
    nummer = volgend
    if (isProject) {
      const { data: bezet } = await admin.from('orders').select('id')
        .or(`order_group.eq.${nummer},order_number.eq.${nummer},order_number.eq.${nummer}-1`).limit(1)
      if (bezet && bezet.length > 0) continue
    }
    const { error } = await admin.from('orders').insert(regels.map((r, i) => ({
      configuration_id: r.configId,
      user_id: eigenaarId,
      order_number: isProject ? `${nummer}-${i + 1}` : nummer,
      ...(isProject && { order_group: nummer }),
      quantity: r.quantity,
      unit_price: r.unitPrice,
      total_price: r.totalPrice,
      notes: notes || null,
      status: 'pending',
    })))
    if (!error) aangemaakt = true
    else if (error.code !== '23505') { laatsteFout = error.message; break }
  }
  if (!aangemaakt) {
    await terugdraaien()
    return { success: false, error: laatsteFout }
  }

  revalidatePath('/admin/configuraties')
  revalidatePath('/bestellingen')
  revalidatePath('/configuraties')
  revalidatePath('/dashboard')
  if (config.project_id) revalidatePath(`/projecten/${config.project_id}`)

  return { success: true, orderNumber: nummer, aantalRegels: regels.length, isOfferte }
}
