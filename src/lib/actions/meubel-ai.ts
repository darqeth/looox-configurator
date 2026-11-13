'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { hasMeubelAccess } from '@/lib/meubel-access'
import { isUuid } from '@/lib/project'
import { AI_MODEL, analyseerSpiegel } from '@/lib/ai/spiegel-analyse'
import {
  AI_MAX_PRODUCTEN, AI_MAX_SPIEGELS, houtkleurenTekst, maakMeubelVoorstel, meubelCatalogusTekst,
  type MeubelAiRuw, type MeubelVoorstel,
} from '@/lib/meubel-ai'
import { getMeubelModel } from '@/lib/meubel-config'
import { saveMeubelConfiguration } from '@/lib/actions/meubel'
import { saveConfiguration } from '@/lib/actions/configurator'
import type { AISuggestion } from '@/lib/types/ai-configurator'
import type { LightType } from '@/lib/configurator-config'

// Het hulpje voor Tailor-Made: de dealer omschrijft wat hij zoekt (tekst en/of schets),
// het taalmodel kiest modellen en keuzes, en maakMeubelVoorstel brengt dat terug naar
// wat de prijslijst kent. Eén meubel gaat ingevuld naar de configurator; meer producten
// worden regels in een project, elk met de vlag "nog nalopen".

const anthropic = new Anthropic()

export type MeubelAiResultaat =
  | { success: false; error: string }
  /** Eén meubel: de configurator opent ingevuld, er is nog niets opgeslagen */
  | { success: true; soort: 'meubel'; voorstel: MeubelVoorstel; meldingen: string[] }
  /** Meerdere producten: regels in een project */
  | { success: true; soort: 'project'; projectId: string; aantal: number; meldingen: string[] }
  /** Alleen een spiegel gevraagd: die stelt de dealer samen in de spiegelconfigurator */
  | { success: true; soort: 'spiegel'; meldingen: string[] }

const MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const

function systeemPrompt(): string {
  return `Je bent het LoooX hulpje voor Tailor-Made: badkamermeubels op maat voor dealers (B2B, Nederland).
De dealer omschrijft wat hij nodig heeft, soms met een schets of foto. Jij kiest per product het best passende model uit de prijslijst en vult in wat je uit de invoer kunt halen.
Retourneer ALLEEN een JSON object, geen markdown, geen uitleg.

REGELS
- Alle maten in hele millimeters. Reken cm en m om (120 cm = 1200, 1,6 m = 1600).
- Gebruik alleen een modelId uit de prijslijst hieronder. Verzin niets.
- Vul alleen in wat uit de invoer blijkt. Laat een veld weg als het niet genoemd is. Gok geen maten.
- "lades" is het aantal lades NAAST elkaar, niet het totaal. Twee laderijen boven elkaar is een eigenschap van het model (bijvoorbeeld een Double).
- Bij een kast staat de breedte in "lengte" en het aantal deuren in "lades".
- Bij een plank staat de dikte in "hoogte".
- Bij waskommen en accessoires kies je de uitvoering met "variant" (het artikelnummer voor het =-teken).
- Noemt de dealer geen aantal, dan is het 1. Hetzelfde product meerdere keren is één product met "aantal".
- Een meubel met ingebouwde waskom (Solid Surface) is één product. Een losse waskom op een houten meubel is een apart product.
- Houtkleuren (houtkleur): ${houtkleurenTekst()}. Wit = white, zwart = black, naturel of licht eiken = pure. Twijfel je, laat het veld weg.
- Maximaal ${AI_MAX_PRODUCTEN} producten.
- Spiegels (geen spiegelkast) horen niet in "producten". Zet per spiegel een volledige omschrijving in "spiegels", met alles wat de dealer erover zegt (vorm, maat, verlichting, opties).
- Een spiegelkast is wel een product: mirror-cabinet.
- Wat je niet in de prijslijst kunt vinden (kranen, douches, verlichting los, enzovoort) zet je kort in "nietGevonden".
- Twijfel over een keuze zet je in "opmerkingen" van dat product: korte Nederlandse zin, zonder streepjes, gericht aan de dealer.

UITVOER
{
  "projectnaam": string of null (alleen als de dealer een naam of klant noemt),
  "producten": [{
    "modelId": string,
    "lengte": number, "hoogte": number, "diepte": number,
    "lades": number,
    "houtkleur": string,
    "variant": string,
    "waskomVorm": "ovaal" | "vierkant", "waskomAantal": 1 | 2,
    "regaalBreedte": number, "regaalZijde": "links" | "rechts",
    "handdoekhouders": 0 | 1 | 2, "handdoekType": "A" | "B",
    "lamp": boolean,
    "organizer": "WORG218" | "WORG242", "divider": "WDIV218" | "WDIV242",
    "aantal": number,
    "opmerkingen": string[]
  }],
  "spiegels": [{ "omschrijving": string, "aantal": number }],
  "nietGevonden": string[]
}
Organizer en Divider: 218 is maat M, 242 is maat L. Alleen bij een meubel met lades, en alleen als de dealer erom vraagt.

PRIJSLIJST (maten in mm)
${meubelCatalogusTekst()}`
}

interface AiUitvoer {
  projectnaam?: unknown
  producten?: unknown
  spiegels?: unknown
  nietGevonden?: unknown
}

function datumNl(): string {
  return new Intl.DateTimeFormat('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Amsterdam' }).format(new Date())
}

/** Zet het voorstel van de spiegel-intake om naar de invoer van saveConfiguration. */
function spiegelInvoer(s: AISuggestion) {
  const rond = s.shape === 'rond'
  const licht = (l: AISuggestion['directLight'] | undefined) => ({
    position: l?.position ?? 'geen',
    type: (l && l.position !== 'geen' ? l.type : null) as LightType | null,
    control: l && l.position !== 'geen' ? l.control : null,
  })
  return {
    shape: s.shape,
    width: rond ? s.diameter ?? 0 : s.width ?? 0,
    height: rond ? s.diameter ?? 0 : s.height ?? 0,
    diameter: rond ? s.diameter ?? null : null,
    organicSizeKey: null,
    glasKleur: s.glasKleur ?? 'helder',
    directLight: licht(s.directLight),
    indirectLight: licht(s.indirectLight),
    selectedOptions: s.selectedOptions ?? [],
    optionSubChoices: s.optionSubChoices ?? {},
  }
}

// Vormen die de wizard met eigen maatregels opbouwt: die laat het hulpje aan de dealer
const SPIEGEL_ZELF = ['sol', 'luna', 'organic', 'op-aanvraag', 'elips']

export async function analyzeMeubelWithAI(input: {
  description: string | null
  imageBase64: string | null
  imageMimeType: string | null
  /** De producten komen als regel bij dit bestaande project */
  projectId?: string | null
}): Promise<MeubelAiResultaat> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Niet ingelogd' }
  if (!await hasMeubelAccess(supabase, user.id)) return { success: false, error: 'Dit account heeft geen toegang tot Tailor-Made' }

  const tekst = (input.description ?? '').trim().slice(0, 3000)
  if (!tekst && !input.imageBase64) return { success: false, error: 'Omschrijf wat je zoekt of voeg een schets toe.' }
  if (input.projectId != null && !isUuid(input.projectId)) return { success: false, error: 'Project niet gevonden' }

  // Zelfde limiet als de spiegel-intake: samen maximaal 20 per uur per gebruiker
  const { data: allowed, error: rlError } = await supabase.rpc('check_rate_limit', {
    p_key: `ai-intake:${user.id}`,
    p_max: 20,
    p_window_seconds: 3600,
  })
  if (rlError) console.error('[rate-limit] check_rate_limit niet beschikbaar:', rlError.message)
  else if (allowed === false) return { success: false, error: 'Je hebt het maximum aantal aanvragen voor dit uur bereikt. Probeer het later opnieuw.' }

  const content: Anthropic.MessageParam['content'] = []
  if (input.imageBase64) {
    const mime = MIME.find((m) => m === input.imageMimeType) ?? 'image/jpeg'
    content.push({ type: 'image', source: { type: 'base64', media_type: mime, data: input.imageBase64 } })
  }
  content.push({ type: 'text', text: tekst || 'Zie de schets. Stel samen wat erop staat.' })

  let uitvoer: AiUitvoer
  try {
    const message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2500,
      system: systeemPrompt(),
      messages: [{ role: 'user', content }],
    })
    const antwoord = message.content[0]?.type === 'text' ? message.content[0].text : ''
    const json = antwoord.match(/\{[\s\S]*\}/)
    if (!json) {
      console.error('[AI meubel] geen JSON in antwoord:', antwoord.slice(0, 500))
      return { success: false, error: 'Het hulpje kon hier niets van maken. Omschrijf het iets uitgebreider.' }
    }
    uitvoer = JSON.parse(json[0]) as AiUitvoer
  } catch (err) {
    console.error('[AI meubel] fout:', err)
    return { success: false, error: 'Het hulpje is even niet bereikbaar. Probeer het opnieuw of stel het meubel zelf samen.' }
  }

  const meldingen: string[] = []
  const ruweProducten = (Array.isArray(uitvoer.producten) ? uitvoer.producten : []).slice(0, AI_MAX_PRODUCTEN) as MeubelAiRuw[]
  const voorstellen: MeubelVoorstel[] = []
  for (const ruw of ruweProducten) {
    const voorstel = ruw && typeof ruw === 'object' ? maakMeubelVoorstel(ruw) : null
    if (voorstel) voorstellen.push(voorstel)
    else meldingen.push(`${getMeubelModel(String(ruw?.modelId ?? ''))?.naam ?? 'Een product'} kon niet worden samengesteld. Voeg het zelf toe.`)
  }
  for (const n of Array.isArray(uitvoer.nietGevonden) ? uitvoer.nietGevonden : []) {
    if (typeof n === 'string' && n.trim()) meldingen.push(`Niet in Tailor-Made: ${n.trim().slice(0, 120)}.`)
  }
  const spiegels = (Array.isArray(uitvoer.spiegels) ? uitvoer.spiegels : [])
    .filter((s): s is { omschrijving: string; aantal?: unknown } => !!s && typeof s === 'object' && typeof (s as { omschrijving?: unknown }).omschrijving === 'string')
    .slice(0, AI_MAX_SPIEGELS)

  if (voorstellen.length === 0 && spiegels.length === 0) {
    return { success: false, error: meldingen[0] ?? 'Het hulpje herkende geen product uit Tailor-Made. Omschrijf het model, de lengte en het aantal lades.' }
  }
  if (voorstellen.length === 0 && spiegels.length === 1) return { success: true, soort: 'spiegel', meldingen }
  if (voorstellen.length === 1 && spiegels.length === 0) return { success: true, soort: 'meubel', voorstel: voorstellen[0], meldingen }

  // Meerdere producten: regels in een project, elk nog na te lopen door de dealer
  const naam = typeof uitvoer.projectnaam === 'string' && uitvoer.projectnaam.trim() ? uitvoer.projectnaam.trim().slice(0, 120) : `Voorstel hulpje ${datumNl()}`
  let projectId = input.projectId ?? null
  let aantal = 0
  for (const v of voorstellen) {
    try {
      const opgeslagen = await saveMeubelConfiguration({
        ...v.config,
        projectName: naam, reference: '', description: '',
        projectId, nieuwProject: projectId === null,
        nalopen: true, aiNotities: v.meldingen,
      })
      projectId = opgeslagen.projectId ?? projectId
      aantal++
    } catch (err) {
      console.error('[AI meubel] regel opslaan mislukt:', err)
      meldingen.push(`${getMeubelModel(v.config.modelId)?.naam ?? 'Een product'} kon niet worden opgeslagen. Voeg het zelf toe.`)
    }
  }
  for (const s of spiegels) {
    try {
      const analyse = await analyseerSpiegel({ description: s.omschrijving.slice(0, 1500), imageBase64: null, imageMimeType: null })
      if (!analyse.success) throw new Error(analyse.error)
      if (SPIEGEL_ZELF.includes(analyse.result.shape)) throw new Error(`vorm ${analyse.result.shape} stelt de dealer zelf samen`)
      const sp = spiegelInvoer(analyse.result)
      if (!sp.width || !sp.height) throw new Error('spiegel zonder maat')
      const opgeslagen = await saveConfiguration({
        ...sp,
        projectName: naam, reference: '', description: '',
        quantity: Math.min(99, Math.max(1, Math.round(Number(s.aantal) || 1))),
        status: 'saved',
        projectId, nieuwProject: projectId === null,
        nalopen: true, aiNotities: (analyse.result.confidenceNotes ?? []).slice(0, 6).map((n) => String(n).slice(0, 200)),
      })
      projectId = opgeslagen.projectId ?? projectId
      aantal++
    } catch (err) {
      console.error('[AI meubel] spiegel toevoegen mislukt:', err)
      meldingen.push('Een spiegel kon niet automatisch worden toegevoegd. Voeg hem toe met "Product toevoegen".')
    }
  }

  if (!projectId || aantal === 0) return { success: false, error: meldingen[0] ?? 'Er kon niets worden opgeslagen. Probeer het opnieuw.' }
  return { success: true, soort: 'project', projectId, aantal, meldingen }
}
