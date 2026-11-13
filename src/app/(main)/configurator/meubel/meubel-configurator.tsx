'use client'

import { comprimeerAfbeelding } from '@/lib/comprimeer-afbeelding'
import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Maximize2, X } from 'lucide-react'
import { toast } from '@/components/toast'
import {
  MEUBEL_MODELLEN, MEUBEL_CATEGORIEEN, HOUTKLEUREN, HOUTKLEUR_DEFAULT, LADE_MIN_MM, LADE_MAX_MM, MEUBEL_AANTAL_MAX,
  getLengteBereik, getLadeOpties, ladeLabel, getMeubelPrijsOpbouw, houtkleurAfbeelding, formatCents,
  getLadeBreedtes, startLadeBreedtes, kanLadesAanpassen, valideerLadeBreedtes, ladeBreedtesTekst,
  UITSPARING_MAX, UITSPARING_NETTO_CENTS, meubelOptiesTekst, parseMeubelFactor,
  getAanvraagBereik, getAanvraagLadeOpties, getHoutkleuren, getMeubelHoogte, ladeRuimte, REGAAL_STANDAARD_MM,
  getDuoPrijs, getDuoReeksen, WASKOM_VORMEN, waskomTekst, type WaskomVorm,
  type MeubelModel, type MeubelCategorieId, type LadeBreedtes, meubelAfmeting,
  getMeubelDiepte, getKastHoogteBereik, kanUitsparing, getArtikelVariant, artikelNummer, PLANK_EXTRAS, HANDDOEKHOUDER_TYPES, heeftExtras, getPlankExtraArtikel, kanLogo, kanLadeAccessoire, getMeubelModel, LADE_ACCESSOIRES, type LadeAccessoire,
  type PlankExtra, type HanddoekType, indelingLabel, indelingTekst, tekeningVerplicht } from '@/lib/meubel-config'
import { saveMeubelConfiguration, updateMeubelConfiguration } from '@/lib/actions/meubel'
import { MeubelTekening } from './meubel-tekening'
import MeubelAiBalk from './meubel-ai-balk'
import type { MeubelVoorstel } from '@/lib/meubel-ai'
import UpsellCards, { upsellVoorMeubels, upsellHref, type UpsellSoort } from '@/components/upsell-cards'

// Stappen: model kiezen, samenstellen (lengte, lades, houtkleur), samenvatting.
// In beeld staat alleen bruto (netto × factor); netto komt pas in de bestelstap.

const STEPS = ['Categorie', 'Model', 'Samenstellen', 'Samenvatting']
// Startbreedte per kast bij een duo-model, en de terugval voor de tekening bij ongeldige invoer
const DUO_START_MM = 700

export interface MeubelInitialConfig {
  /** Ontbreekt bij een voorstel van het hulpje: ingevuld, maar nog niet opgeslagen */
  id?: string
  /** Wat de dealer moet nakijken aan een door het hulpje ingevulde configuratie */
  aiNotities?: string[]
  /** Door het hulpje ingevuld en nog niet nagelopen */
  nalopen?: boolean
  modelId: string
  lengte: number
  lades: number
  ladeBreedtes: LadeBreedtes
  houtkleur: string
  opAanvraag?: boolean
  hoogte?: number
  logo?: boolean
  regaalBreedte?: number
  regaalZijde?: 'links' | 'rechts' | 'midden'
  waskomVorm?: WaskomVorm | null
  waskomAantal?: number
  uitsparingen?: number
  attachmentUrl?: string | null
  diepte?: number | null
  handdoekhouders?: number
  handdoekType?: HanddoekType
  extra?: PlankExtra | null
  extraArtikel?: string | null
  lampen?: number
  organizer?: string | null
  divider?: string | null
  variant?: string | null
  quantity: number
  projectName: string
  reference: string
  description: string
}

/** Project (winkelmandje) waar deze regel bij komt of al bij hoort; naam en referentie volgen het project */
export interface MeubelProject {
  id: string
  naam: string
  referentie: string
}

type Props = { factor: number; initialConfig?: MeubelInitialConfig; project?: MeubelProject | null; startCategorie?: MeubelCategorieId }

/** Een voorstel van het hulpje vult de configurator opnieuw: de key zet alle keuzes in één keer goed. */
export default function MeubelConfigurator(props: Props) {
  const [voorstel, setVoorstel] = useState<{ nr: number; config: MeubelInitialConfig } | null>(null)
  return (
    <MeubelConfiguratorInner
      key={voorstel?.nr ?? 0}
      {...props}
      initialConfig={voorstel?.config ?? props.initialConfig}
      onVoorstel={(v, meldingen) => setVoorstel((vorige) => ({
        nr: (vorige?.nr ?? 0) + 1,
        config: { ...v.config, aiNotities: [...v.meldingen, ...meldingen], nalopen: true, projectName: '', reference: '', description: '' },
      }))}
    />
  )
}

function MeubelConfiguratorInner({ factor, initialConfig, project, startCategorie, onVoorstel }: Props & { onVoorstel: (voorstel: MeubelVoorstel, meldingen: string[]) => void }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEditing = !!initialConfig?.id

  const [basisModel, setModel] = useState<MeubelModel | null>(
    () => MEUBEL_MODELLEN.find((m) => m.id === initialConfig?.modelId) ?? null,
  )
  // Gekozen hoogte bij modellen met meerdere hoogtes (Full-Frame, U-Frame); geen prijsverschil
  const [hoogteKeuze, setHoogteKeuze] = useState<number | null>(initialConfig?.hoogte ?? null)
  // Overal waar het model getoond wordt geldt de gekozen hoogte
  // Kast: de diepte uit de lijst en de hoogte uit de lijst of vrij binnen de staffel
  const [diepteKeuze, setDiepteKeuze] = useState<number | null>(initialConfig?.diepte ?? null)
  const [kastHoogteTekst, setKastHoogteTekst] = useState(String(initialConfig?.hoogte ?? basisModel?.hoogte ?? 1800))
  const kastHoogteBereik = basisModel ? getKastHoogteBereik(basisModel) : null
  const kastHoogteInvoer = /^\d+$/.test(kastHoogteTekst) ? Number(kastHoogteTekst) : NaN
  const kastHoogteOk = !kastHoogteBereik || (kastHoogteInvoer >= kastHoogteBereik.min && kastHoogteInvoer <= kastHoogteBereik.max)
  // Plank: vrije diepte binnen een bereik, handdoekhouders en wat eronder hangt
  const [plankDiepteTekst, setPlankDiepteTekst] = useState(String(initialConfig?.diepte ?? basisModel?.diepte ?? 0))
  const plankDiepteBereik = basisModel?.plank?.diepteBereik ?? null
  const plankDiepteInvoer = /^\d+$/.test(plankDiepteTekst) ? Number(plankDiepteTekst) : NaN
  const [handdoekhouders, setHanddoekhouders] = useState(initialConfig?.handdoekhouders ?? 0)
  const [handdoekType, setHanddoekType] = useState<HanddoekType>(initialConfig?.handdoekType ?? 'A')
  const [extra, setExtra] = useState<PlankExtra | null>(initialConfig?.extra ?? null)
  const [extraArtikelKeuze, setExtraArtikel] = useState<string | null>(initialConfig?.extraArtikel ?? null)
  const [lampen, setLampen] = useState(Math.min(1, initialConfig?.lampen ?? 0))
  const [ladeAcc, setLadeAcc] = useState<Record<LadeAccessoire, string | null>>({ organizer: initialConfig?.organizer ?? null, divider: initialConfig?.divider ?? null })
  // Met een handdoekhouder moet de plank diep genoeg zijn
  const houderMinDiepte = basisModel?.plank?.handdoekhouder && handdoekhouders > 0 ? basisModel.plank.handdoekhouder.minDiepte : 0
  const plankDiepteOk = !plankDiepteBereik || (plankDiepteInvoer >= Math.max(plankDiepteBereik.min, houderMinDiepte) && plankDiepteInvoer <= plankDiepteBereik.max)
  // Vast artikel: de gekozen uitvoering
  const [variantKeuze, setVariant] = useState<string | null>(initialConfig?.variant ?? null)
  const variant = basisModel?.artikel ? getArtikelVariant(basisModel, variantKeuze) ?? basisModel.artikel.varianten[0] : null
  const model = basisModel ? {
    ...basisModel,
    hoogte: getMeubelHoogte(basisModel, kastHoogteBereik ? (kastHoogteOk ? kastHoogteInvoer : null) : hoogteKeuze),
    diepte: getMeubelDiepte(basisModel, plankDiepteBereik ? (plankDiepteOk ? plankDiepteInvoer : null) : diepteKeuze),
    afmetingTekst: variant?.afmeting,
    afbeelding: variant?.afbeelding ?? basisModel.afbeelding,
  } : null
  const [categorie, setCategorie] = useState<MeubelCategorieId | null>(basisModel?.categorie ?? startCategorie ?? null)
  // 0 categorie, 1 model, 2 samenstellen, 3 samenvatting
  const [step, setStep] = useState(model ? 2 : startCategorie ? 1 : 0)
  const [lengteTekst, setLengteTekst] = useState(String(initialConfig?.lengte ?? 1200))
  // Laatste geldige lengte: tekening en opties blijven staan terwijl je typt
  const [laatsteLengte, setLaatsteLengte] = useState(initialConfig?.lengte ?? 1200)
  const [lades, setLades] = useState(initialConfig?.lades ?? 2)
  const [eigenBreedtes, setEigenBreedtes] = useState<LadeBreedtes>(initialConfig?.ladeBreedtes ?? null)
  const [houtkleurKeuze, setHoutkleur] = useState(initialConfig?.houtkleur || HOUTKLEUR_DEFAULT)
  // Groter dan de standaardmaten: geen prijs, het meubel is dan altijd op aanvraag
  const [opAanvraag, setOpAanvraag] = useState(initialConfig?.opAanvraag === true)
  const [tekeningGroot, setTekeningGroot] = useState(false)
  // Regaalkast bij Regal-modellen: kant en breedte
  const [regaalTekst, setRegaalTekst] = useState(String(initialConfig?.regaalBreedte || REGAAL_STANDAARD_MM))
  const [regaalZijde, setRegaalZijde] = useState<'links' | 'rechts'>(initialConfig?.regaalZijde === 'links' ? 'links' : 'rechts')
  // Solid Surface met ingebouwde waskom: vorm en aantal, zonder prijsverschil
  const [waskomVorm, setWaskomVorm] = useState<WaskomVorm>(initialConfig?.waskomVorm ?? 'ovaal')
  const [waskomAantal, setWaskomAantal] = useState(initialConfig?.waskomAantal === 2 ? 2 : 1)
  // Duo-model (Drawer Box Regal): breedte per kast in plaats van één lengte
  const [kastTekst, setKastTekst] = useState<[string, string]>([
    String(initialConfig?.ladeBreedtes?.[0] ?? DUO_START_MM), String(initialConfig?.ladeBreedtes?.[1] ?? DUO_START_MM),
  ])
  // Opties uit de tabel "Opties meubels": logo is gratis, een uitsparing kost per stuk
  // Logo staat standaard aan (Mark, 12 nov); bij bewerken geldt wat is opgeslagen
  const [logo, setLogo] = useState(initialConfig ? initialConfig.logo === true : true)
  const [uitsparingen, setUitsparingen] = useState(initialConfig?.uitsparingen ?? 0)
  // Maattekening: bij elk meubel nodig om te bestellen (plaats van waskom, kraan, afvoer en uitsparingen).
  // Een offerte opslaan kan zonder; de bestelstap houdt het tegen.
  // Nieuw gekozen bestand, of de al opgeslagen bijlage
  const [tekeningBestand, setTekeningBestand] = useState<File | null>(null)
  const bestaandeTekening = initialConfig?.attachmentUrl ?? null
  // Alleen weergave, wordt niet opgeslagen
  const [toonHout, setToonHout] = useState(true)
  const [quantity, setQuantity] = useState(initialConfig?.quantity ?? 1)
  const [projectName, setProjectName] = useState(project?.naam ?? initialConfig?.projectName ?? '')
  const [reference, setReference] = useState(project?.referentie ?? initialConfig?.reference ?? '')
  const [description, setDescription] = useState(initialConfig?.description ?? '')

  if (!categorie || step === 0) {
    return (
      <Kader step={0} onStep={setStep} maxStep={model ? 3 : categorie ? 1 : 0}>
        <div className="w-full">
          <h1 className="text-[20px] font-bold text-lx-text-primary tracking-tight">Tailor-Made</h1>
          <p className="text-[13px] text-lx-text-secondary mt-1 mb-5">Omschrijf wat je zoekt, of kies zelf een categorie.</p>
          {!isEditing && <MeubelAiBalk projectId={project?.id} onVoorstel={onVoorstel} />}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MEUBEL_CATEGORIEEN.map((c) => {
              const modellen = MEUBEL_MODELLEN.filter((m) => m.categorie === c.id)
              const leeg = modellen.length === 0
              return (
                <button
                  key={c.id}
                  disabled={leeg}
                  onClick={() => { setCategorie(c.id); setStep(1) }}
                  aria-pressed={categorie === c.id}
                  className={`flex flex-col items-stretch justify-start text-left bg-white rounded-[18px] border shadow-sm overflow-hidden transition-colors ${
                    leeg ? 'opacity-60 cursor-not-allowed border-black/6' : `cursor-pointer hover:border-lx-cta ${categorie === c.id ? 'border-lx-cta' : 'border-black/6'}`
                  }`}
                >
                  <div className="relative aspect-[16/9] w-full flex-shrink-0 bg-lx-panel-bg">
                    {modellen[0] && <Image src={modellen[0].afbeelding} alt="" fill sizes="(min-width: 1024px) 320px, (min-width: 640px) 480px, 100vw" className="object-contain p-4" />}
                  </div>
                  <div className="px-5 py-4">
                    <p className="font-semibold text-lx-text-primary text-[15px]">{c.naam}</p>
                    <p className="text-[13px] text-lx-text-secondary mt-0.5">{c.omschrijving}</p>
                    <p className="text-[12px] text-lx-text-muted mt-2">{leeg ? 'Binnenkort' : `${modellen.length} ${modellen.length === 1 ? 'model' : 'modellen'}`}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </Kader>
    )
  }

  if (!model || step === 1) {
    return (
      <Kader step={1} onStep={setStep} maxStep={model ? 3 : 1}>
        <div className="w-full">
          <h1 className="text-[20px] font-bold text-lx-text-primary tracking-tight">{MEUBEL_CATEGORIEEN.find((c) => c.id === categorie)?.naam ?? 'Model'}</h1>
          <p className="text-[13px] text-lx-text-secondary mt-1 mb-5">{isEditing ? 'Kies een ander model.' : 'Kies een model.'}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MEUBEL_MODELLEN.filter((m) => m.categorie === categorie).map((m) => {
              const b = getLengteBereik(m)
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    // Ander model: lengte en indeling die daar niet bestaan vervallen
                    if (m.id !== model?.id) {
                      const vast = m.kast?.breedtes ?? m.vasteLengtes
                      const l = vast ? (vast.includes(laatsteLengte) ? laatsteLengte : vast[0]) : Math.min(Math.max(laatsteLengte, b.min), b.max)
                      setLengteTekst(String(l)); setLaatsteLengte(l); setEigenBreedtes(null); setOpAanvraag(false); setHoogteKeuze(null)
                      setDiepteKeuze(null); setKastHoogteTekst(String(m.hoogte))
                      setPlankDiepteTekst(String(m.diepte)); setHanddoekhouders(0); setExtra(null); setVariant(null)
                    }
                    setModel(m); setStep(2)
                  }}
                  aria-pressed={model?.id === m.id}
                  className={`flex flex-col items-stretch justify-start text-left bg-white rounded-[18px] border shadow-sm overflow-hidden hover:border-lx-cta transition-colors cursor-pointer ${model?.id === m.id ? 'border-lx-cta' : 'border-black/6'}`}
                >
                  <div className="relative aspect-[4/3] w-full flex-shrink-0 bg-lx-panel-bg">
                    <Image src={m.afbeelding} alt={m.naam} fill sizes="(min-width: 1024px) 320px, (min-width: 640px) 480px, 100vw" className="object-contain p-5" />
                  </div>
                  <div className="px-5 py-4">
                    <p className="font-semibold text-lx-text-primary text-[15px]">{m.naam}</p>
                    <p className="text-[13px] text-lx-text-secondary mt-0.5">{m.omschrijving}</p>
                    <p className="text-[12px] text-lx-text-muted mt-2">
                      {m.artikel
                        ? `${m.artikel.varianten.length} ${m.artikel.varianten.length === 1 ? 'uitvoering' : 'uitvoeringen'}`
                        : m.plank
                        ? `Lengte ${m.plank.lengte.min} tot ${m.plank.lengte.max} mm · diepte ${m.plank.dieptes ? m.plank.dieptes.join(' / ') : `${m.plank.diepteBereik?.min} tot ${m.plank.diepteBereik?.max}`} mm · dikte ${m.plank.diktes.join(' / ')} mm`
                        : m.kast
                        ? `Breedte ${m.kast.breedtes.join(' / ')} mm · hoogte ${m.kast.hoogtes ? m.kast.hoogtes.join(' / ') : `${getKastHoogteBereik(m)?.min} tot ${getKastHoogteBereik(m)?.max}`} mm · diepte ${m.kast.dieptes.join(' / ')} mm`
                        : `Lengte ${b.min} tot ${b.max} mm · hoogte ${m.hoogtes ? m.hoogtes.join(' / ') : m.hoogte} mm · diepte ${m.diepte} mm`}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </Kader>
    )
  }

  const standaardBereik = getLengteBereik(model)
  const bereik = opAanvraag ? getAanvraagBereik(model) : standaardBereik

  // Regaalkast: bij een ongeldige breedte blijft de tekening op de standaard staan
  const regaalInvoer = /^\d+$/.test(regaalTekst) ? Number(regaalTekst) : NaN
  const regaalOk = !model.regaal || (regaalInvoer >= model.regaal.min && regaalInvoer <= model.regaal.max)
  const regaalMm = model.regaal ? (regaalOk ? regaalInvoer : REGAAL_STANDAARD_MM) : 0

  // Duo: twee kastbreedtes die in dezelfde reeks van de prijslijst moeten vallen; de lengte is de som
  const isDuo = !!model.duo
  const duoInvoer = kastTekst.map((t) => (/^\d+$/.test(t) ? Number(t) : 0))
  const duoOk = isDuo && getDuoPrijs(model, duoInvoer) !== null
  const duoBreedtes = duoOk ? duoInvoer : [DUO_START_MM, DUO_START_MM]

  const lengte = isDuo ? duoBreedtes[0] + duoBreedtes[1] + regaalMm : /^\d+$/.test(lengteTekst) ? Number(lengteTekst) : NaN
  const lengteOk = isDuo
    ? duoOk
    : model.artikel
    ? variant !== null
    : model.plank
    ? lengte >= bereik.min && lengte <= bereik.max && plankDiepteOk
    : model.kast
    ? model.kast.breedtes.includes(lengte) && kastHoogteOk
    : lengte >= bereik.min && lengte <= bereik.max && (opAanvraag || !model.vasteLengtes || model.vasteLengtes.includes(lengte))
  if (!isDuo && lengteOk && lengte !== laatsteLengte) {
    setLaatsteLengte(lengte)
    setEigenBreedtes(null) // een eigen indeling hoort bij één lengte
  }
  const tekenLengte = isDuo || lengteOk ? lengte : laatsteLengte

  // Lades verdelen de lengte min de rand van het frame en min de regaalkast
  const ruimte = ladeRuimte(model, tekenLengte, regaalMm)
  const opties = opAanvraag ? (model.zonderLades ? [0] : getAanvraagLadeOpties(ruimte)) : getLadeOpties(model, tekenLengte, regaalMm)
  // Vaste maten waaruit de dealer kiest: breedtes van een kast of de standaardlengtes van een model
  const vasteMaten = model.kast?.breedtes ?? model.vasteLengtes
  const hoogteKeuzes = model.kast ? model.kast.hoogtes : model.plank ? model.plank.diktes : model.hoogtes
  const diepteKeuzes = model.kast?.dieptes ?? model.plank?.dieptes
  const magExtra = heeftExtras(model, variant?.id)
  const magLadeAcc = kanLadeAccessoire(model)
  const ladeAccKeuze = magLadeAcc ? ladeAcc : { organizer: null, divider: null }
  const extraArtikel = magExtra ? getPlankExtraArtikel(extra, extraArtikelKeuze) : null
  const plankKeuzes = { handdoekhouders, handdoekType, extra: magExtra ? extra : null, extraArtikel: extraArtikel?.id, variant: variant?.id, lampen: model.lamp ? lampen : 0 }
  // Vervalt de gekozen indeling bij een andere lengte, dan de eerste die wel kan
  const gekozen = opties.includes(lades) ? lades : opties[0]
  const breedtes = isDuo ? duoBreedtes : eigenBreedtes && eigenBreedtes.length === gekozen ? eigenBreedtes : null
  const ladeFout = isDuo ? null : valideerLadeBreedtes(breedtes, ruimte, gekozen)
  const magAanpassen = !isDuo && kanLadesAanpassen(ruimte, gekozen)
  // Niet elke kleur kan bij elk model (Stripes: geen White); valt de keuze af, dan de standaard
  const kleuren = getHoutkleuren(model)
  const houtkleur = kleuren.some((k) => k.id === houtkleurKeuze) ? houtkleurKeuze : HOUTKLEUR_DEFAULT
  const kleurNaam = kleuren.find((k) => k.id === houtkleur)?.naam ?? ''
  const opbouw = lengteOk && !opAanvraag ? getMeubelPrijsOpbouw({ modelId: model.id, lengte, lades: gekozen, houtkleur, uitsparingen, hoogte: model.hoogte, diepte: model.diepte,
    ...(model.plank?.handdoekhouder && handdoekhouders > 0 && { handdoekhouders, handdoekType }), ...(magExtra && extra && { extra, extraArtikel: extraArtikel?.id }), ...(model.lamp && lampen > 0 && { lampen }), ...(ladeAccKeuze.organizer && { organizer: ladeAccKeuze.organizer }), ...(ladeAccKeuze.divider && { divider: ladeAccKeuze.divider }), ...(variant && { variant: variant.id }), regaalBreedte: regaalMm || undefined, ladeBreedtes: breedtes }, factor) : null
  // Zonder maattekening kan LoooX het meubel niet maken: opslaan mag, bestellen niet
  const magUitsparing = kanUitsparing(model)
  const tekeningNodig = tekeningVerplicht(model, uitsparingen)
  const tekeningOntbreekt = tekeningNodig && !tekeningBestand && !bestaandeTekening
  const geldig = lengteOk && regaalOk && !ladeFout && gekozen !== undefined && (opAanvraag || opbouw !== null)

  async function uploadTekening(): Promise<string | null> {
    if (!tekeningBestand) return bestaandeTekening
    const supabase = createClient()
    const bestand = await comprimeerAfbeelding(tekeningBestand)
    const ext = bestand.name.split('.').pop() ?? 'bin'
    const pad = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('attachments').upload(pad, bestand, { upsert: false })
    if (error) {
      console.error('[upload] maattekening', error)
      throw new Error('Uploaden van de maattekening is mislukt. Probeer het opnieuw.')
    }
    return supabase.storage.from('attachments').getPublicUrl(pad).data.publicUrl
  }

  function wisselAanvraag(aan: boolean) {
    // Lengte meteen binnen het nieuwe bereik zetten, zodat er nooit een ongeldige tussenstand is
    const l = aan ? standaardBereik.max + 1 : standaardBereik.max
    setOpAanvraag(aan)
    setLengteTekst(String(l)); setLaatsteLengte(l); setEigenBreedtes(null)
  }

  function kiesLades(n: number) {
    setLades(n)
    setEigenBreedtes(null)
  }

  // De laatste lade krijgt wat overblijft, zodat het totaal altijd de lengte is
  function zetBreedte(index: number, tekst: string) {
    if (!breedtes) return
    const waarde = Number(tekst.replace(/\D/g, '').slice(0, 4)) || 0
    const nieuw = breedtes.map((b, i) => (i === index ? waarde : b))
    nieuw[nieuw.length - 1] = ruimte - nieuw.slice(0, -1).reduce((som, b) => som + b, 0)
    setEigenBreedtes(nieuw)
  }

  // nieuwProject: opslaan als eerste regel van een project, om er daarna een product aan toe te voegen.
  // vervolg: bijverkoop, na het opslaan direct door naar de waskom of spiegel voor hetzelfde project.
  function handleSave(nieuwProject = false, vervolg?: UpsellSoort) {
    if (!geldig || !projectName.trim() || !model) return
    const basis = {
      modelId: model.id, lengte, lades: gekozen, ladeBreedtes: breedtes, houtkleur, opAanvraag, hoogte: model.hoogte,
      logo: logo && kanLogo(model), uitsparingen: magUitsparing ? uitsparingen : 0,
      ...((model.kast || model.plank) && { diepte: model.diepte }),
      ...(model.plank?.handdoekhouder && { handdoekhouders, handdoekType }),
      ...(magExtra && { extra, extraArtikel: extraArtikel?.id ?? null }),
      ...(model.lamp && { lampen }),
      ...(magLadeAcc && ladeAccKeuze),
      ...(variant && { variant: variant.id }),
      ...(model.regaal && { regaalBreedte: regaalMm, regaalZijde: isDuo ? 'midden' as const : regaalZijde }),
      ...(model.waskom && { waskomVorm, waskomAantal }),
      quantity, projectName: projectName.trim(), reference, description,
    }
    startTransition(async () => {
      try {
        const payload = { ...basis, attachmentUrl: await uploadTekening() }
        const { projectId } = initialConfig?.id
          ? await updateMeubelConfiguration(initialConfig.id, payload)
          : await saveMeubelConfiguration({ ...payload, projectId: project?.id ?? null, nieuwProject })
        // Een regel van een project gaat terug naar het project, een losse configuratie naar de lijst
        router.push(projectId ? (vervolg ? upsellHref(vervolg, projectId) : `/projecten/${projectId}`) : '/configuraties')
      } catch (e) {
        console.error(e)
        toast(e instanceof Error ? e.message : 'Opslaan mislukt. Probeer het opnieuw.')
      }
    })
  }

  return (
    <Kader step={step} onStep={setStep} maxStep={geldig ? 3 : 2}>
      {/* Links: stap */}
      <div className="flex-1 min-w-0 w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-lx-divider p-5">
          {step === 2 && (
            <div className="space-y-6">
              {initialConfig?.nalopen && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-900">
                  <p className="font-semibold">Ingevuld door het hulpje. Controleer de keuzes en sla op.</p>
                  {(initialConfig.aiNotities ?? []).length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {(initialConfig.aiNotities ?? []).map((n) => <li key={n}>{n}</li>)}
                    </ul>
                  )}
                </div>
              )}
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-[72px] shrink-0 rounded-xl bg-lx-panel-bg overflow-hidden">
                  <Image src={model.afbeelding} alt="" fill sizes="96px" className="object-contain p-1.5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-[18px] font-bold text-lx-text-primary tracking-tight">{model.naam}</h1>
                  <p className="text-[12.5px] text-lx-text-secondary mt-0.5">{model.artikel ? variant?.afmeting : model.plank ? `Diepte ${model.diepte} mm · dikte ${model.hoogte} mm` : `Hoogte ${model.hoogte} mm · diepte ${model.diepte} mm`}</p>
                  <button onClick={() => setStep(1)} className="text-[12.5px] font-semibold text-lx-cta hover:underline cursor-pointer mt-1">
                    Ander model
                  </button>
                </div>
              </div>

              {model.artikel ? (
                <div>
                  <p className="text-[13px] font-medium text-lx-text-primary mb-1.5">Uitvoering</p>
                  <div className="space-y-2" role="radiogroup" aria-label="Uitvoering">
                    {model.artikel.varianten.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        role="radio"
                        aria-checked={variant?.id === v.id}
                        onClick={() => setVariant(v.id)}
                        className={`w-full flex items-center justify-between gap-4 text-left px-4 py-3 rounded-xl border transition-colors cursor-pointer ${
                          variant?.id === v.id ? 'border-lx-cta bg-lx-icon-bg' : 'border-black/10 hover:border-black/25'
                        }`}
                      >
                        {v.afbeelding && (
                          <span className="relative w-14 h-[42px] flex-shrink-0">
                            <Image src={v.afbeelding} alt="" fill sizes="56px" className="object-contain" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-semibold text-lx-text-primary">{v.naam}</span>
                          <span className="block text-[11.5px] text-lx-text-secondary">{v.afmeting}{artikelNummer(v) ? ` · art. ${v.id}` : ''}</span>
                        </span>
                        <span className="text-[13px] font-semibold text-lx-text-primary tabular-nums flex-shrink-0">{formatCents(Math.round(v.prijs * parseMeubelFactor(factor)))}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : isDuo ? (
                <div>
                  <p className="text-[13px] font-medium text-lx-text-primary mb-1.5">Kasten</p>
                  <div className="flex flex-wrap items-end gap-2.5">
                    {(['Kast links', 'Kast rechts'] as const).map((label, i) => (
                      <div key={label}>
                        <label htmlFor={`meubel-kast-${i}`} className="block text-[11.5px] font-medium text-lx-text-secondary mb-1">{label}</label>
                        <input
                          id={`meubel-kast-${i}`}
                          inputMode="numeric"
                          value={kastTekst[i]}
                          onChange={(e) => {
                            const waarde = e.target.value.replace(/\D/g, '').slice(0, 4)
                            setKastTekst(i === 0 ? [waarde, kastTekst[1]] : [kastTekst[0], waarde])
                          }}
                          aria-invalid={!duoOk}
                          aria-describedby="meubel-kast-hulp"
                          className={`w-24 h-10 rounded-xl border text-center text-[14px] font-semibold text-lx-text-primary outline-none bg-white px-2 ${duoOk ? 'border-black/10 focus:border-lx-cta' : 'border-red-400'}`}
                        />
                      </div>
                    ))}
                    <span className="text-[13px] text-lx-text-secondary pb-2.5">mm</span>
                  </div>
                  <p id="meubel-kast-hulp" className={`text-[12px] mt-1.5 leading-relaxed ${duoOk ? 'text-lx-text-muted' : 'text-red-600'}`}>
                    Elke kast heeft één lade. Beide kasten moeten in dezelfde reeks vallen: {getDuoReeksen(model).map((r) => `${r.min} tot ${r.max} mm`).join(' of ')}.
                    {duoOk ? ` Totale lengte met regaalkast: ${lengte} mm.` : ''}
                  </p>
                </div>
              ) : (
                <div>
                  {vasteMaten ? (
                    <>
                      <p className="text-[13px] font-medium text-lx-text-primary mb-1.5">{model.kast ? 'Breedte' : 'Lengte'}</p>
                      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={model.kast ? 'Breedte' : 'Lengte'}>
                        {vasteMaten.map((l) => (
                          <button
                            key={l}
                            type="button"
                            role="radio"
                            aria-checked={lengte === l}
                            onClick={() => setLengteTekst(String(l))}
                            className={`px-3.5 h-10 rounded-xl border text-[13px] font-semibold transition-colors cursor-pointer ${
                              lengte === l
                                ? 'border-lx-cta bg-lx-icon-bg text-lx-text-primary'
                                : 'border-black/10 text-lx-text-secondary hover:text-lx-text-primary'
                            }`}
                          >
                            {l} mm
                          </button>
                        ))}
                      </div>
                      {!model.kast && (
                        <p className={`text-[12px] mt-1.5 ${lengteOk ? 'text-lx-text-muted' : 'text-red-600'}`}>
                          Dit model is alleen in deze standaardmaten te bestellen.
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <label htmlFor="meubel-lengte" className="block text-[13px] font-medium text-lx-text-primary mb-1.5">Lengte</label>
                      <div className="flex items-center gap-2">
                        <input
                          id="meubel-lengte"
                          inputMode="numeric"
                          value={lengteTekst}
                          onChange={(e) => setLengteTekst(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          aria-invalid={!lengteOk}
                          aria-describedby="meubel-lengte-hulp"
                          className={`w-24 h-10 rounded-xl border text-center text-[14px] font-semibold text-lx-text-primary outline-none bg-white px-2 ${lengteOk ? 'border-black/10 focus:border-lx-cta' : 'border-red-400'}`}
                        />
                        <span className="text-[13px] text-lx-text-secondary">mm</span>
                      </div>
                      <p id="meubel-lengte-hulp" className={`text-[12px] mt-1.5 ${lengteOk ? 'text-lx-text-muted' : 'text-red-600'}`}>
                        Hele millimeters, van {bereik.min} tot {bereik.max} mm.
                      </p>
                    </>
                  )}

                  {!model.geenAanvraag && (
                    <label className="mt-3 flex items-center justify-between gap-4 bg-lx-panel-bg rounded-xl p-4 cursor-pointer select-none">
                      <span>
                        <span className="block text-[13px] font-medium text-lx-text-primary">Groter dan {standaardBereik.max} mm</span>
                        <span className="block text-[11.5px] text-lx-text-secondary">
                          Buiten de standaardmaten is dit meubel altijd op aanvraag, zonder prijs vooraf.
                        </span>
                      </span>
                      <input type="checkbox" checked={opAanvraag} onChange={(e) => wisselAanvraag(e.target.checked)} className="sr-only peer" />
                      <span className="shrink-0 w-11 h-6 rounded-full bg-gray-200 peer-checked:bg-lx-cta peer-focus-visible:ring-2 peer-focus-visible:ring-lx-cta peer-focus-visible:ring-offset-2 relative transition-colors after:content-[''] after:absolute after:top-1 after:left-1 after:w-4 after:h-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5" />
                    </label>
                  )}
                </div>
              )}

              {model.regaal && (
                <div>
                  <p className="text-[13px] font-medium text-lx-text-primary mb-1.5">Regaalkast</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    {!isDuo && (
                      <div className="flex gap-2" role="radiogroup" aria-label="Kant van de regaalkast">
                        {(['links', 'rechts'] as const).map((zijde) => (
                          <button
                            key={zijde}
                            type="button"
                            role="radio"
                            aria-checked={regaalZijde === zijde}
                            onClick={() => setRegaalZijde(zijde)}
                            className={`px-3.5 h-10 rounded-xl border text-[13px] font-semibold transition-colors cursor-pointer ${
                              regaalZijde === zijde
                                ? 'border-lx-cta bg-lx-icon-bg text-lx-text-primary'
                                : 'border-black/10 text-lx-text-secondary hover:text-lx-text-primary'
                            }`}
                          >
                            {zijde === 'links' ? 'Links' : 'Rechts'}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <label htmlFor="meubel-regaal" className="text-[12.5px] text-lx-text-secondary">Breedte</label>
                      <input
                        id="meubel-regaal"
                        inputMode="numeric"
                        value={regaalTekst}
                        onChange={(e) => { setRegaalTekst(e.target.value.replace(/\D/g, '').slice(0, 3)); setEigenBreedtes(null) }}
                        aria-invalid={!regaalOk}
                        aria-describedby="meubel-regaal-hulp"
                        className={`w-20 h-10 rounded-xl border text-center text-[14px] font-semibold text-lx-text-primary outline-none bg-white px-2 ${regaalOk ? 'border-black/10 focus:border-lx-cta' : 'border-red-400'}`}
                      />
                      <span className="text-[13px] text-lx-text-secondary">mm</span>
                    </div>
                  </div>
                  <p id="meubel-regaal-hulp" className={`text-[12px] mt-1.5 ${regaalOk ? 'text-lx-text-muted' : 'text-red-600'}`}>
                    {isDuo ? 'Open vak tussen de twee kasten' : 'Open vak naast de lades'}, {model.regaal.min} tot {model.regaal.max} mm breed.{isDuo ? '' : ' De lengte is inclusief de regaalkast.'}
                  </p>
                </div>
              )}

              {kastHoogteBereik && (
                <div>
                  <label htmlFor="meubel-kast-hoogte" className="block text-[13px] font-medium text-lx-text-primary mb-1.5">Hoogte</label>
                  <div className="flex items-center gap-2">
                    <input
                      id="meubel-kast-hoogte"
                      inputMode="numeric"
                      value={kastHoogteTekst}
                      onChange={(e) => setKastHoogteTekst(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      aria-invalid={!kastHoogteOk}
                      aria-describedby="meubel-kast-hoogte-hulp"
                      className={`w-24 h-10 rounded-xl border text-center text-[14px] font-semibold text-lx-text-primary outline-none bg-white px-2 ${kastHoogteOk ? 'border-black/10 focus:border-lx-cta' : 'border-red-400'}`}
                    />
                    <span className="text-[13px] text-lx-text-secondary">mm</span>
                  </div>
                  <p id="meubel-kast-hoogte-hulp" className={`text-[12px] mt-1.5 ${kastHoogteOk ? 'text-lx-text-muted' : 'text-red-600'}`}>
                    Hele millimeters, van {kastHoogteBereik.min} tot {kastHoogteBereik.max} mm.
                  </p>
                </div>
              )}

              {hoogteKeuzes && hoogteKeuzes.length > 1 && (
                <div>
                  <p className="text-[13px] font-medium text-lx-text-primary mb-1.5">{model.plank ? 'Dikte' : 'Hoogte'}</p>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={model.plank ? 'Dikte' : 'Hoogte'}>
                    {hoogteKeuzes.map((hgt) => (
                      <button
                        key={hgt}
                        type="button"
                        role="radio"
                        aria-checked={model.hoogte === hgt}
                        onClick={() => setHoogteKeuze(hgt)}
                        className={`px-3.5 h-10 rounded-xl border text-[13px] font-semibold transition-colors cursor-pointer ${
                          model.hoogte === hgt
                            ? 'border-lx-cta bg-lx-icon-bg text-lx-text-primary'
                            : 'border-black/10 text-lx-text-secondary hover:text-lx-text-primary'
                        }`}
                      >
                        {hgt} mm
                      </button>
                    ))}
                  </div>
                  {!model.kast && !model.plank && <p className="text-[12px] text-lx-text-muted mt-1.5">De hoogte heeft geen invloed op de prijs.</p>}
                </div>
              )}

              {plankDiepteBereik && (
                <div>
                  <label htmlFor="meubel-plank-diepte" className="block text-[13px] font-medium text-lx-text-primary mb-1.5">Diepte</label>
                  <div className="flex items-center gap-2">
                    <input
                      id="meubel-plank-diepte"
                      inputMode="numeric"
                      value={plankDiepteTekst}
                      onChange={(e) => setPlankDiepteTekst(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      aria-invalid={!plankDiepteOk}
                      aria-describedby="meubel-plank-diepte-hulp"
                      className={`w-24 h-10 rounded-xl border text-center text-[14px] font-semibold text-lx-text-primary outline-none bg-white px-2 ${plankDiepteOk ? 'border-black/10 focus:border-lx-cta' : 'border-red-400'}`}
                    />
                    <span className="text-[13px] text-lx-text-secondary">mm</span>
                  </div>
                  <p id="meubel-plank-diepte-hulp" className={`text-[12px] mt-1.5 ${plankDiepteOk ? 'text-lx-text-muted' : 'text-red-600'}`}>
                    Hele millimeters, van {Math.max(plankDiepteBereik.min, houderMinDiepte)} tot {plankDiepteBereik.max} mm.
                    {houderMinDiepte > 0 ? ` Met een handdoekhouder is de plank minimaal ${houderMinDiepte} mm diep.` : ''}
                  </p>
                </div>
              )}

              {model.plank?.handdoekhouder && (
                <div>
                  <p className="text-[13px] font-medium text-lx-text-primary mb-1.5">Handdoekhouder</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-3">
                    <div className="flex gap-2" role="radiogroup" aria-label="Aantal handdoekhouders">
                      {[0, 1, 2].map((n) => (
                        <button
                          key={n}
                          type="button"
                          role="radio"
                          aria-checked={handdoekhouders === n}
                          onClick={() => setHanddoekhouders(n)}
                          className={`px-3.5 h-10 rounded-xl border text-[13px] font-semibold transition-colors cursor-pointer ${
                            handdoekhouders === n ? 'border-lx-cta bg-lx-icon-bg text-lx-text-primary' : 'border-black/10 text-lx-text-secondary hover:text-lx-text-primary'
                          }`}
                        >
                          {n === 0 ? 'Geen' : n === 1 ? '1 houder' : '2 houders'}
                        </button>
                      ))}
                    </div>
                    {handdoekhouders > 0 && (
                      <div className="flex gap-2" role="radiogroup" aria-label="Type handdoekhouder">
                        {HANDDOEKHOUDER_TYPES.map((t) => (
                          <button
                            key={t}
                            type="button"
                            role="radio"
                            aria-checked={handdoekType === t}
                            onClick={() => setHanddoekType(t)}
                            className={`w-[104px] rounded-xl border p-1.5 text-[12px] font-semibold text-center transition-colors cursor-pointer ${
                              handdoekType === t ? 'border-lx-cta bg-lx-icon-bg text-lx-text-primary' : 'border-black/10 text-lx-text-secondary hover:text-lx-text-primary'
                            }`}
                          >
                            <span className="relative block w-full aspect-[3/2] mb-1 rounded-lg overflow-hidden">
                              <Image src={`/images/meubels/handdoekhouder-${t.toLowerCase()}.webp`} alt="" fill sizes="104px" className="object-cover" />
                            </span>
                            Type {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-[12px] text-lx-text-muted mt-1.5">
                    {formatCents(Math.round(model.plank.handdoekhouder.prijs * parseMeubelFactor(factor)))} per handdoekhouder. In mat zwart of geborsteld rvs; geef de kleur door bij Opmerking.
                  </p>
                </div>
              )}

              {model.lamp && (
                <div>
                  <p className="text-[13px] font-medium text-lx-text-primary mb-1.5">Verlichting</p>
                  <div className="flex items-center gap-4 rounded-xl border border-black/10 p-3">
                    <span className="relative w-20 h-[60px] flex-shrink-0">
                      <Image src="/images/meubels/extra-mirror-light.webp" alt="" fill sizes="80px" className="object-contain" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-lx-text-primary">{model.lamp.naam}</span>
                      <span className="block text-[11.5px] text-lx-text-secondary">{model.lamp.omschrijving} · art. {model.lamp.id}</span>
                      <span className="block text-[11.5px] text-lx-text-secondary">{formatCents(model.lamp.bruto)}</span>
                    </span>
                    <div className="flex gap-2 flex-shrink-0" role="radiogroup" aria-label="Lamp">
                      {[0, 1].map((n) => (
                        <button
                          key={n}
                          type="button"
                          role="radio"
                          aria-checked={lampen === n}
                          onClick={() => setLampen(n)}
                          className={`px-3 h-10 rounded-xl border text-[13px] font-semibold transition-colors cursor-pointer ${
                            lampen === n ? 'border-lx-cta bg-lx-icon-bg text-lx-text-primary' : 'border-black/10 text-lx-text-secondary hover:text-lx-text-primary'
                          }`}
                        >
                          {n === 0 ? 'Zonder' : 'Met lamp'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[12px] text-lx-text-muted mt-1.5">Wordt los meegeleverd. Catalogusprijs, exclusief btw.</p>
                </div>
              )}

              {magExtra && (
                <div>
                  <p className="text-[13px] font-medium text-lx-text-primary mb-1.5">Onder de plank</p>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2" role="radiogroup" aria-label="Accessoire onder de plank">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={extra === null}
                      onClick={() => setExtra(null)}
                      className={`flex flex-col items-center justify-center rounded-xl border p-2 text-[11.5px] font-semibold transition-colors cursor-pointer ${
                        extra === null ? 'border-lx-cta bg-lx-icon-bg text-lx-text-primary' : 'border-black/10 text-lx-text-secondary hover:text-lx-text-primary'
                      }`}
                    >
                      Geen
                    </button>
                    {PLANK_EXTRAS.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        role="radio"
                        aria-checked={extra === e.id}
                        onClick={() => setExtra(e.id)}
                        className={`flex flex-col items-center rounded-xl border p-2 text-[11.5px] font-semibold text-center leading-tight transition-colors cursor-pointer ${
                          extra === e.id ? 'border-lx-cta bg-lx-icon-bg text-lx-text-primary' : 'border-black/10 text-lx-text-secondary hover:text-lx-text-primary'
                        }`}
                      >
                        <span className="relative block w-full aspect-[4/3] mb-1">
                          <Image src={`/images/meubels/extra-${e.id}.webp`} alt="" fill sizes="90px" className="object-contain" />
                        </span>
                        {e.naam}
                      </button>
                    ))}
                  </div>
                  {extra && extraArtikel && (
                    <div className="mt-2 space-y-1.5" role="radiogroup" aria-label="Maat en kleur">
                      {PLANK_EXTRAS.find((e) => e.id === extra)?.artikelen.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          role="radio"
                          aria-checked={extraArtikel.id === a.id}
                          onClick={() => setExtraArtikel(a.id)}
                          className={`w-full flex items-center justify-between gap-4 text-left px-3.5 py-2 rounded-xl border transition-colors cursor-pointer ${
                            extraArtikel.id === a.id ? 'border-lx-cta bg-lx-icon-bg' : 'border-black/10 hover:border-black/25'
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block text-[13px] font-semibold text-lx-text-primary">{a.maat}, {a.kleur}</span>
                            <span className="block text-[11.5px] text-lx-text-secondary">art. {a.id}</span>
                          </span>
                          <span className="text-[13px] font-semibold text-lx-text-primary tabular-nums flex-shrink-0">{formatCents(a.bruto)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-[12px] text-lx-text-muted mt-1.5">Catalogusprijs, exclusief btw.</p>
                </div>
              )}

              {diepteKeuzes && diepteKeuzes.length > 1 && (
                <div>
                  <p className="text-[13px] font-medium text-lx-text-primary mb-1.5">Diepte</p>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Diepte">
                    {diepteKeuzes.map((d) => (
                      <button
                        key={d}
                        type="button"
                        role="radio"
                        aria-checked={model.diepte === d}
                        onClick={() => setDiepteKeuze(d)}
                        className={`px-3.5 h-10 rounded-xl border text-[13px] font-semibold transition-colors cursor-pointer ${
                          model.diepte === d
                            ? 'border-lx-cta bg-lx-icon-bg text-lx-text-primary'
                            : 'border-black/10 text-lx-text-secondary hover:text-lx-text-primary'
                        }`}
                      >
                        {d} mm
                      </button>
                    ))}
                  </div>
                  {!model.plank?.kolom && <p className="text-[12px] text-lx-text-muted mt-1.5">De diepte heeft geen invloed op de prijs.</p>}
                </div>
              )}

              {!isDuo && !model.zonderLades && (!model.kast || model.kast.deurenNaarHoogte) && (
                <div>
                  <p className="text-[13px] font-medium text-lx-text-primary mb-1.5">{model.kast ? 'Deuren' : 'Lades'}</p>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={model.kast ? 'Aantal deuren' : 'Aantal lades'}>
                    {opties.map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={gekozen === n}
                        onClick={() => kiesLades(n)}
                        className={`px-3.5 h-10 rounded-xl border text-[13px] font-semibold transition-colors cursor-pointer ${
                          gekozen === n
                            ? 'border-lx-cta bg-lx-icon-bg text-lx-text-primary'
                            : 'border-black/10 text-lx-text-secondary hover:text-lx-text-primary'
                        }`}
                      >
                        {ladeLabel(model, n)}
                      </button>
                    ))}
                  </div>
                  <p className="text-[12px] text-lx-text-muted mt-1.5">
                    {model.kast
                      ? `${opties.length > 1 ? 'Zonder prijsverschil. ' : ''}Een deur is maximaal 120 cm hoog${opties.length > 1 ? '.' : ', dus deze kast krijgt twee gelijke deuren.'}`
                      : `Welke indelingen kunnen, hangt af van de lengte.${model.rand ? ` De rand van ${model.rand} mm aan beide zijden gaat er eerst af.` : ''}`}
                  </p>


                  {magAanpassen && !model.kast && (
                    <div className="mt-4 bg-lx-panel-bg rounded-xl p-4">
                      <label className="flex items-center justify-between gap-4 cursor-pointer select-none">
                        <span>
                          <span className="block text-[13px] font-medium text-lx-text-primary">Breedtes zelf instellen</span>
                          <span className="block text-[11.5px] text-lx-text-secondary">
                            Standaard zijn de lades even breed. Per lade {LADE_MIN_MM} tot {LADE_MAX_MM} mm.
                          </span>
                        </span>
                        <input
                          type="checkbox"
                          checked={breedtes !== null}
                          onChange={(e) => setEigenBreedtes(e.target.checked ? startLadeBreedtes(ruimte, gekozen) : null)}
                          className="sr-only peer"
                        />
                        <span className="shrink-0 w-11 h-6 rounded-full bg-gray-200 peer-checked:bg-lx-cta peer-focus-visible:ring-2 peer-focus-visible:ring-lx-cta peer-focus-visible:ring-offset-2 relative transition-colors after:content-[''] after:absolute after:top-1 after:left-1 after:w-4 after:h-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5" />
                      </label>

                      {breedtes && (
                        <>
                          {model.rand && (
                            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-3" role="note">
                              <svg className="flex-shrink-0 mt-0.5" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                              </svg>
                              <p className="text-[12px] text-amber-800 leading-relaxed">
                                <strong>Let op:</strong> dit model heeft een rand van {model.rand} mm aan beide zijden. De lades verdelen samen {ruimte} mm, niet de volle {tekenLengte} mm.
                              </p>
                            </div>
                          )}
                          <div className="flex flex-wrap items-end gap-2.5 mt-4">
                            {breedtes.map((b, i) => {
                              const laatste = i === breedtes.length - 1
                              const fout = b < LADE_MIN_MM || b > LADE_MAX_MM
                              return (
                                <div key={i}>
                                  <label htmlFor={`meubel-lade-${i}`} className="block text-[11.5px] font-medium text-lx-text-secondary mb-1">
                                    Lade {i + 1}{laatste ? ' (rest)' : ''}
                                  </label>
                                  <input
                                    id={`meubel-lade-${i}`}
                                    inputMode="numeric"
                                    value={b}
                                    readOnly={laatste}
                                    aria-invalid={fout}
                                    onChange={(e) => zetBreedte(i, e.target.value)}
                                    className={`w-[72px] h-10 rounded-xl border text-center text-[14px] font-semibold outline-none px-2 ${
                                      laatste ? 'bg-transparent text-lx-text-secondary' : 'bg-white text-lx-text-primary focus:border-lx-cta'
                                    } ${fout ? 'border-red-400' : 'border-black/10'}`}
                                  />
                                </div>
                              )
                            })}
                            <span className="text-[13px] text-lx-text-secondary pb-2.5">mm</span>
                          </div>
                          <p className={`text-[12px] mt-2 ${ladeFout ? 'text-red-600' : 'text-lx-text-muted'}`} role={ladeFout ? 'alert' : undefined}>
                            {ladeFout ?? `De laatste lade krijgt wat overblijft van ${ruimte} mm.`}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {model.waskom && (
                <div>
                  <p className="text-[13px] font-medium text-lx-text-primary mb-1.5">Waskom</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-3">
                    <div className="flex gap-2" role="radiogroup" aria-label="Vorm van de waskom">
                      {WASKOM_VORMEN.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          role="radio"
                          aria-checked={waskomVorm === v.id}
                          onClick={() => setWaskomVorm(v.id)}
                          className={`px-3.5 h-10 rounded-xl border text-[13px] font-semibold transition-colors cursor-pointer ${
                            waskomVorm === v.id
                              ? 'border-lx-cta bg-lx-icon-bg text-lx-text-primary'
                              : 'border-black/10 text-lx-text-secondary hover:text-lx-text-primary'
                          }`}
                        >
                          {v.naam}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2" role="radiogroup" aria-label="Aantal waskommen">
                      {[1, 2].map((n) => (
                        <button
                          key={n}
                          type="button"
                          role="radio"
                          aria-checked={waskomAantal === n}
                          onClick={() => setWaskomAantal(n)}
                          className={`px-3.5 h-10 rounded-xl border text-[13px] font-semibold transition-colors cursor-pointer ${
                            waskomAantal === n
                              ? 'border-lx-cta bg-lx-icon-bg text-lx-text-primary'
                              : 'border-black/10 text-lx-text-secondary hover:text-lx-text-primary'
                          }`}
                        >
                          {n === 1 ? '1 waskom' : '2 waskommen'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[12px] text-lx-text-muted mt-1.5">
                    Ingebouwd in het Solid Surface blad, zonder meerprijs. Teken de plaats van de {waskomAantal === 2 ? 'waskommen' : 'waskom'} op de maattekening.
                  </p>
                </div>
              )}

              {!model.geenHout && <div>
                <p className="text-[13px] font-medium text-lx-text-primary mb-1.5">
                  Houtkleur <span className="font-normal text-lx-text-secondary">· {kleurNaam}</span>
                </p>
                <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Houtkleur">
                  {kleuren.map((k) => (
                    <button
                      key={k.id}
                      type="button"
                      role="radio"
                      aria-checked={houtkleur === k.id}
                      aria-label={k.naam}
                      title={k.naam}
                      onClick={() => setHoutkleur(k.id)}
                      className={`relative w-12 h-12 rounded-xl overflow-hidden cursor-pointer transition-shadow ${
                        houtkleur === k.id ? 'ring-2 ring-lx-cta ring-offset-2' : 'ring-1 ring-black/10 hover:ring-black/30'
                      }`}
                    >
                      <Image src={houtkleurAfbeelding(k.id)} alt="" fill sizes="48px" className="object-cover" />
                    </button>
                  ))}
                </div>
              </div>}

              {magLadeAcc && (
                <div>
                  <p className="text-[13px] font-medium text-lx-text-primary mb-1.5">Voor in de lade</p>
                  <div className="space-y-2">
                    {LADE_ACCESSOIRES.map((soort) => {
                      const acc = getMeubelModel(soort)
                      if (!acc?.artikel) return null
                      return (
                        <div key={soort} className="flex items-center gap-4 rounded-xl border border-black/10 p-3">
                          <span className="relative w-20 h-[60px] flex-shrink-0">
                            <Image src={acc.afbeelding} alt="" fill sizes="80px" className="object-contain" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-semibold text-lx-text-primary">{acc.naam}</span>
                            <span className="block text-[11.5px] text-lx-text-secondary">{acc.omschrijving}</span>
                            <span className="block text-[11.5px] text-lx-text-secondary">
                              {acc.artikel.varianten.map((v) => `${v.naam} ${formatCents(Math.round(v.prijs * parseMeubelFactor(factor)))}`).join(' · ')}
                            </span>
                          </span>
                          <div className="flex gap-2 flex-shrink-0" role="radiogroup" aria-label={acc.naam}>
                            {[null, ...acc.artikel.varianten.map((v) => v.id)].map((id) => (
                              <button
                                key={id ?? 'geen'}
                                type="button"
                                role="radio"
                                aria-checked={ladeAcc[soort] === id}
                                onClick={() => setLadeAcc((s) => ({ ...s, [soort]: id }))}
                                className={`px-3 h-10 rounded-xl border text-[13px] font-semibold transition-colors cursor-pointer ${
                                  ladeAcc[soort] === id ? 'border-lx-cta bg-lx-icon-bg text-lx-text-primary' : 'border-black/10 text-lx-text-secondary hover:text-lx-text-primary'
                                }`}
                              >
                                {id === null ? 'Geen' : acc.artikel!.varianten.find((v) => v.id === id)!.naam}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-[12px] text-lx-text-muted mt-1.5">Eén per meubel. Elke Organizer wordt geleverd met 1 Divider.</p>
                </div>
              )}

              {(kanLogo(model) || magUitsparing) && <div>
                <p className="text-[13px] font-medium text-lx-text-primary mb-1.5">Opties</p>
                <div className="bg-lx-panel-bg rounded-xl p-4 space-y-4">
                  {kanLogo(model) && <label className="flex items-center justify-between gap-4 cursor-pointer select-none">
                    <span>
                      <span className="block text-[13px] font-medium text-lx-text-primary">Met logo</span>
                      <span className="block text-[11.5px] text-lx-text-secondary">LoooX-logo op het front. Zonder meerprijs.</span>
                    </span>
                    <input type="checkbox" checked={logo} onChange={(e) => setLogo(e.target.checked)} className="sr-only peer" />
                    <span className="shrink-0 w-11 h-6 rounded-full bg-gray-200 peer-checked:bg-lx-cta peer-focus-visible:ring-2 peer-focus-visible:ring-lx-cta peer-focus-visible:ring-offset-2 relative transition-colors after:content-[''] after:absolute after:top-1 after:left-1 after:w-4 after:h-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5" />
                  </label>}

                  {magUitsparing && <div className={model.geenHout ? '' : 'pt-4 border-t border-lx-divider'}>
                    <div className="flex items-center justify-between gap-4">
                      <span>
                        <span id="meubel-uitsparingen-label" className="block text-[13px] font-medium text-lx-text-primary">Uitsparingen of boorgaten</span>
                        <span className="block text-[11.5px] text-lx-text-secondary">
                          {opAanvraag ? 'Per stuk, volgens je maattekening.' : `${formatCents(Math.round(UITSPARING_NETTO_CENTS * parseMeubelFactor(factor)))} per stuk, volgens je maattekening.`}
                        </span>
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => setUitsparingen((u) => Math.max(0, u - 1))}
                          aria-label="Eén uitsparing minder"
                          className="w-9 h-9 rounded-xl bg-white border border-black/8 text-lx-text-primary text-lg font-light hover:bg-lx-border transition-colors flex items-center justify-center cursor-pointer"
                        >−</button>
                        <span aria-labelledby="meubel-uitsparingen-label" aria-live="polite" className="w-8 text-center text-[14px] font-bold text-lx-text-primary tabular-nums">{uitsparingen}</span>
                        <button
                          onClick={() => setUitsparingen((u) => Math.min(UITSPARING_MAX, u + 1))}
                          aria-label="Eén uitsparing meer"
                          className="w-9 h-9 rounded-xl bg-white border border-black/8 text-lx-text-primary text-lg font-light hover:bg-lx-border transition-colors flex items-center justify-center cursor-pointer"
                        >+</button>
                      </div>
                    </div>
                  </div>}
                </div>
              </div>}

              {magUitsparing && <div>
                <p className="text-[13px] font-medium text-lx-text-primary mb-1.5">Maattekening{!tekeningNodig && <span className="font-normal text-lx-text-secondary"> (optioneel)</span>}</p>
                <label className="block cursor-pointer">
                  <input
                    id="meubel-tekening"
                    type="file"
                    accept="image/*,.pdf"
                    className="sr-only peer"
                    aria-describedby="meubel-tekening-hulp"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) setTekeningBestand(f) }}
                  />
                  <span className="block border-2 border-dashed border-lx-cta/25 hover:border-lx-cta/50 peer-focus-visible:border-lx-cta rounded-xl px-4 py-4 text-center text-[12.5px] text-lx-text-secondary transition-colors">
                    {tekeningBestand
                      ? <>Gekozen: <span className="font-semibold text-lx-text-primary">{tekeningBestand.name}</span> · <span className="text-lx-cta font-semibold">ander bestand</span></>
                      : bestaandeTekening
                        ? <>Maattekening al toegevoegd · <span className="text-lx-cta font-semibold">vervangen</span></>
                        : <><span className="text-lx-cta font-semibold">Maattekening toevoegen</span> (afbeelding of PDF)</>}
                  </span>
                </label>
                <p id="meubel-tekening-hulp" className="text-[12px] text-lx-text-muted mt-1.5 leading-relaxed">
                  {model.kast
                    ? (uitsparingen > 0 ? 'Teken hierop de plaats en maat van elke uitsparing.' : 'Alleen nodig als er uitsparingen in de kast moeten.')
                    : model.plank
                    ? (uitsparingen > 0 ? 'Teken hierop de plaats en maat van elke uitsparing.' : 'Alleen nodig als er uitsparingen in de plank moeten.')
                    : `Teken hierop de plaats van de waskom, kraan en afvoer${uitsparingen > 0 ? ', en de plaats en maat van elke uitsparing' : ''}.`}
                </p>
                {tekeningOntbreekt && <TekeningNodig />}
              </div>}

              {model.opmerking && (
                <p className="text-[12px] text-lx-text-secondary leading-relaxed" role="note">{model.opmerking}</p>
              )}

              <button
                onClick={() => setStep(3)}
                disabled={!geldig}
                className="w-full h-11 rounded-xl bg-lx-cta text-white text-[13.5px] font-semibold hover:bg-lx-cta-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                Verder naar samenvatting
              </button>
            </div>
          )}

          {step === 3 && geldig && (
            <div className="space-y-5">
              <h1 className="text-[16px] font-semibold text-lx-text-primary">Samenvatting</h1>

              <div className="bg-lx-panel-bg rounded-2xl p-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-lx-text-secondary mb-2">Configuratie</p>
                <Rij label="Model" waarde={model.naam} onEdit={() => setStep(1)} />
                <Rij label="Afmeting" waarde={`${meubelAfmeting(model, lengte)}${opAanvraag ? ' · op aanvraag' : ''}`} onEdit={() => setStep(2)} />
                <Rij label={isDuo ? 'Kasten' : indelingLabel(model)} waarde={isDuo ? `Links ${duoBreedtes[0]} mm, rechts ${duoBreedtes[1]} mm, elk 1 lade` : indelingTekst(model, gekozen, breedtes, ladeRuimte(model, lengte, regaalMm), plankKeuzes)} onEdit={() => setStep(2)} />
                {model.regaal && <Rij label="Regaalkast" waarde={`${regaalMm} mm breed, ${isDuo ? 'in het midden' : regaalZijde}`} onEdit={() => setStep(2)} />}
                {model.waskom && <Rij label="Waskom" waarde={waskomTekst({ waskomVorm, waskomAantal })} onEdit={() => setStep(2)} />}
                {!model.geenHout && <Rij label="Houtkleur" waarde={kleurNaam} onEdit={() => setStep(2)} />}
                <Rij label="Opties" waarde={meubelOptiesTekst({ logo: logo && kanLogo(model), uitsparingen, ...ladeAccKeuze })} onEdit={() => setStep(2)} />
              </div>

              <div className="bg-lx-panel-bg rounded-2xl p-4 flex items-center gap-4">
                <span id="meubel-aantal-label" className="text-[13px] font-medium text-lx-text-primary flex-shrink-0">Aantal</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Eén minder"
                    className="w-9 h-9 rounded-xl bg-white border border-black/8 text-lx-text-primary text-lg font-light hover:bg-lx-border transition-colors flex items-center justify-center cursor-pointer"
                  >−</button>
                  <input
                    inputMode="numeric"
                    aria-labelledby="meubel-aantal-label"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.min(MEUBEL_AANTAL_MAX, Math.max(1, parseInt(e.target.value.replace(/\D/g, '')) || 1)))}
                    className="w-16 h-9 rounded-xl border-2 border-lx-cta text-center text-[14px] font-bold text-lx-cta bg-white outline-none"
                  />
                  <button
                    onClick={() => setQuantity((q) => Math.min(MEUBEL_AANTAL_MAX, q + 1))}
                    aria-label="Eén meer"
                    className="w-9 h-9 rounded-xl bg-white border border-black/8 text-lx-text-primary text-lg font-light hover:bg-lx-border transition-colors flex items-center justify-center cursor-pointer"
                  >+</button>
                </div>
              </div>

              {opbouw ? (
                <div className="bg-lx-panel-bg rounded-xl px-4 py-3 space-y-1.5">
                  <p className="text-[12px] text-lx-text-secondary tabular-nums">{quantity} × {formatCents(opbouw.totaal)}</p>
                  <div className="flex items-center justify-between border-t border-lx-divider pt-1.5">
                    <span className="text-[12.5px] text-lx-text-secondary font-medium">Totaal bruto ex. BTW</span>
                    <span className="text-[18px] font-bold text-lx-cta tabular-nums">{formatCents(opbouw.totaal * quantity)}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-lx-panel-bg rounded-xl px-4 py-3">
                  <p className="text-[15px] font-bold text-lx-cta">Op aanvraag</p>
                  <p className="text-[12px] text-lx-text-secondary mt-0.5 leading-relaxed">
                    Dit meubel is groter dan de standaardmaten. LoooX bepaalt de prijs na beoordeling van je aanvraag.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-lx-text-secondary">Projectgegevens</p>
                {project ? (
                  <div className="bg-lx-panel-bg rounded-xl px-4 py-3">
                    <p className="text-[13px] font-semibold text-lx-text-primary">{project.naam}</p>
                    <p className="text-[12px] text-lx-text-secondary mt-0.5">
                      {project.referentie ? `Referentie: ${project.referentie}. ` : ''}
                      {isEditing ? 'Deze regel hoort bij dit project.' : 'Dit product wordt aan dit project toegevoegd.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label htmlFor="meubel-project" className="text-[12px] font-semibold text-lx-text-secondary mb-1.5 block">
                        Projectnaam <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="meubel-project"
                        type="text"
                        maxLength={200}
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="Bijv. Badkamer renovatie De Vries"
                        className="w-full h-10 rounded-xl border border-black/12 px-3.5 text-[13.5px] text-lx-text-primary placeholder-lx-placeholder outline-none focus:border-lx-cta bg-white transition-colors"
                      />
                    </div>
                    <div>
                      <label htmlFor="meubel-referentie" className="text-[12px] font-semibold text-lx-text-secondary mb-1.5 block">Referentie</label>
                      <input
                        id="meubel-referentie"
                        type="text"
                        maxLength={200}
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="Eigen ordernummer of klantnaam"
                        className="w-full h-10 rounded-xl border border-black/12 px-3.5 text-[13.5px] text-lx-text-primary placeholder-lx-placeholder outline-none focus:border-lx-cta bg-white transition-colors"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label htmlFor="meubel-opmerking" className="text-[12px] font-semibold text-lx-text-secondary mb-1.5 block">Opmerking</label>
                  <textarea
                    id="meubel-opmerking"
                    rows={3}
                    maxLength={5000}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-xl border border-black/12 px-3.5 py-2.5 text-[13.5px] text-lx-text-primary outline-none focus:border-lx-cta bg-white transition-colors resize-y"
                  />
                </div>
              </div>

              {tekeningOntbreekt && <TekeningNodig />}

              <button
                onClick={() => handleSave()}
                disabled={!projectName.trim() || isPending}
                className="w-full h-11 rounded-xl bg-lx-cta text-white text-[13.5px] font-semibold hover:bg-lx-cta-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isPending ? 'Opslaan…' : isEditing ? 'Wijzigingen opslaan' : project ? 'Toevoegen aan project' : opAanvraag ? 'Opslaan als aanvraag' : 'Opslaan als offerte'}
              </button>
              {!isEditing && !project && (
                <button
                  onClick={() => handleSave(true)}
                  disabled={!projectName.trim() || isPending}
                  className="w-full h-11 rounded-xl border border-black/10 text-lx-text-primary text-[13.5px] font-semibold hover:bg-lx-panel-bg transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  Opslaan en nog een product toevoegen
                </button>
              )}
              {!projectName.trim() && (
                <p className="text-[11px] text-lx-text-secondary text-center">Vul een projectnaam in om op te slaan</p>
              )}
              {!isEditing && !project && (() => {
                const upsell = upsellVoorMeubels([model])
                if (!upsell.waskom && !upsell.spiegel) return null
                return (
                  <div className="pt-3 border-t border-lx-divider">
                    <p className="text-[13px] font-semibold text-lx-text-primary">Maak het compleet</p>
                    <p className="text-[11.5px] text-lx-text-secondary mt-0.5 mb-1">We slaan dit meubel op in een project en je stelt het volgende product direct samen. Zo bestel je alles in één keer.</p>
                    <UpsellCards {...upsell} onKies={(soort) => handleSave(true, soort)} disabled={!projectName.trim() || isPending} />
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Rechts: tekening en prijs */}
      <div className="w-full lg:w-[400px] lg:flex-shrink-0 lg:sticky lg:top-[68px] space-y-4">
        <div className="relative bg-white rounded-2xl shadow-sm border border-black/8 p-4">
{model.artikel ? (
            <div className="relative w-full aspect-[4/3]"><Image src={model.afbeelding} alt={model.naam} fill sizes="400px" className="object-contain" /></div>
          ) : (
                    <MeubelTekening
            model={model}
            lengte={tekenLengte}
            breedtes={model.kast ? [] : getLadeBreedtes(breedtes, ruimte, gekozen)}
            deuren={gekozen}
            houtkleur={houtkleur}
            toonHout={toonHout}
            regaal={model.regaal ? { breedte: regaalMm, zijde: isDuo ? 'midden' : regaalZijde } : null}
            waskom={model.waskom ? { vorm: waskomVorm, aantal: waskomAantal } : null}
          />
          )}
          <p className="text-[11px] text-lx-text-secondary text-center">{model.artikel ? `${variant?.naam ?? ''} · ${variant?.afmeting ?? ''}` : model.categorie === 'solid-surface' || model.plank ? 'Bovenaanzicht en vooraanzicht, maten in mm' : `Vooraanzicht, maten in mm · diepte ${model.diepte} mm`}</p>
{!model.artikel &&           <button
            onClick={() => setTekeningGroot(true)}
            aria-label="Tekening groot bekijken"
            title="Groot bekijken"
            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-lg bg-white/90 border border-black/8 text-lx-text-secondary hover:text-lx-text-primary hover:border-black/20 flex items-center justify-center transition-colors cursor-pointer"
          >
            <Maximize2 size={14} />
          </button>}
        </div>

        {tekeningGroot && (
          <TekeningPopup
            titel={`${model.naam} · ${model.kast ? meubelAfmeting(model, tekenLengte) : `${tekenLengte} mm · ${ladeLabel(model, gekozen)}`}`}
            onClose={() => setTekeningGroot(false)}
          >
            <MeubelTekening
              model={model}
              lengte={tekenLengte}
              breedtes={model.kast ? [] : getLadeBreedtes(breedtes, ruimte, gekozen)}
              deuren={gekozen}
              houtkleur={houtkleur}
              toonHout={toonHout}
              regaal={model.regaal ? { breedte: regaalMm, zijde: isDuo ? 'midden' : regaalZijde } : null}
            waskom={model.waskom ? { vorm: waskomVorm, aantal: waskomAantal } : null}
            />
            <p className="text-[12px] text-lx-text-secondary text-center mt-1">
              Vooraanzicht, maten in mm · hoogte {model.hoogte} mm · diepte {model.diepte} mm
            </p>
          </TekeningPopup>
        )}

        {/* Weergave-toggle onder de kaart, net als bij de spiegels */}
        {!model.geenHout && !model.artikel && <label className="flex items-center justify-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={toonHout} onChange={(e) => setToonHout(e.target.checked)} className="sr-only peer" />
          <span className="w-8 h-[18px] rounded-full bg-black/15 peer-checked:bg-lx-cta peer-focus-visible:ring-2 peer-focus-visible:ring-lx-cta peer-focus-visible:ring-offset-2 relative transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-[14px] after:h-[14px] after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-[14px]" />
          <span className="text-[12px] text-lx-text-secondary font-medium">Houtkleur in tekening</span>
        </label>}

        <div className="bg-white rounded-2xl shadow-sm border border-black/8 p-5 space-y-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-lx-text-secondary mb-1">Bruto ex. BTW</p>
            <p className="text-[28px] font-bold text-lx-text-primary tabular-nums" aria-live="polite">
              {opbouw ? formatCents(opbouw.totaal) : opAanvraag ? 'Op aanvraag' : 'Geen prijs'}
            </p>
            <p className="text-[11px] text-lx-text-secondary mt-0.5 leading-relaxed">
              {opbouw ? 'Per stuk, excl. btw' : opAanvraag ? 'Groter dan de standaardmaten. De prijs volgt na beoordeling door LoooX.' : 'Vul een geldige lengte in.'}
            </p>
          </div>
          {opbouw && (
            <div className="space-y-1.5 border-t border-lx-divider pt-3">
              {opbouw.regels.map((regel) => (
                <div key={regel.label} className="flex justify-between gap-2 text-[12px]">
                  <span className="text-lx-text-secondary truncate">{regel.label}</span>
                  <span className="text-lx-text-primary font-semibold flex-shrink-0 tabular-nums">{formatCents(regel.cents)}</span>
                </div>
              ))}
              <div className="flex justify-between gap-2 text-[13px] font-bold pt-1.5 border-t border-lx-divider mt-1.5">
                <span className="text-lx-text-primary">Bruto totaal</span>
                <span className="text-lx-cta tabular-nums">{formatCents(opbouw.totaal)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Kader>
  )
}

// Melding met uitroepteken: opslaan kan zonder maattekening, bestellen niet
function TekeningNodig() {
  return (
    <div className="mt-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-3" role="note">
      <svg className="flex-shrink-0 mt-0.5" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4M12 17h.01" />
      </svg>
      <p className="text-[12px] text-amber-800 leading-relaxed">
        <strong>Nog geen maattekening.</strong> Opslaan als offerte kan zonder, maar om te bestellen is een maattekening verplicht. Je kunt hem later toevoegen vanuit het overzicht.
      </p>
    </div>
  )
}

// Grote weergave van de tekening. Sluit met Escape, de knop of een klik naast het venster.
function TekeningPopup({ titel, onClose, children }: { titel: string; onClose: () => void; children: React.ReactNode }) {
  const titelId = useId()
  const sluitRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    sluitRef.current?.focus()
    const opToets = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', opToets)
    return () => document.removeEventListener('keydown', opToets)
  }, [onClose])

  // Via een portal: de kolom met de tekening is sticky en zou het venster anders onder het menu houden
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titelId}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[92vh] overflow-auto p-5 sm:p-7"
      >
        <div className="flex items-center justify-between gap-4 mb-3">
          <h2 id={titelId} className="text-[15px] font-semibold text-lx-text-primary">{titel}</h2>
          <button
            ref={sluitRef}
            onClick={onClose}
            aria-label="Sluiten"
            className="w-9 h-9 rounded-lg text-lx-text-muted hover:text-lx-text-primary hover:bg-lx-panel-bg flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

function Rij({ label, waarde, onEdit }: { label: string; waarde: string; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-lx-divider last:border-0">
      <span className="text-[12.5px] text-lx-text-secondary font-medium flex-shrink-0 w-24">{label}</span>
      <span className="text-[13px] text-lx-text-primary font-medium flex-1">{waarde}</span>
      <button onClick={onEdit} className="text-[12px] text-lx-cta font-semibold hover:underline flex-shrink-0 cursor-pointer">
        Wijzigen
      </button>
    </div>
  )
}

// Zelfde stappenbalk en kolommen als de spiegelconfigurators
function Kader({ step, maxStep, onStep, children }: {
  step: number
  /** Verste stap waar je nu naartoe mag springen */
  maxStep: number
  onStep: (step: number) => void
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen bg-lx-divider">
      <div className="bg-white border-b border-lx-divider sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <ol className="flex items-center gap-1 max-w-xl">
            {STEPS.map((label, i) => {
              const bereikbaar = i !== step && i <= maxStep
              return (
                <li key={label} className="flex items-center gap-1 flex-1 last:flex-none">
                  <button
                    onClick={() => bereikbaar && onStep(i)}
                    disabled={!bereikbaar}
                    aria-current={i === step ? 'step' : undefined}
                    className={`flex items-center gap-1.5 ${bereikbaar ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <span className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center flex-shrink-0 transition-colors ${
                      i <= step ? 'bg-lx-cta text-white' : 'bg-lx-panel-bg text-lx-text-secondary'
                    }`}>
                      {i < step ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      ) : i + 1}
                    </span>
                    <span className={`text-[12px] font-semibold hidden sm:inline ${i === step ? 'text-lx-text-primary' : 'text-lx-text-secondary'}`}>
                      {label}
                    </span>
                  </button>
                  {i < STEPS.length - 1 && <div className="flex-1 h-px bg-lx-divider mx-1" />}
                </li>
              )
            })}
          </ol>
        </div>
      </div>
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 flex flex-col lg:flex-row gap-6 items-start">
        {children}
      </div>
    </div>
  )
}
