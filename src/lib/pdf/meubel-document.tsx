import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet, Svg, Rect, Line, Text as SvgText } from '@react-pdf/renderer'
import { PdfLogo } from './pdf-logo'
import { formatDate } from './helpers'
import { formatMm, formatPct, getLadeBreedtes, getMeubelOrderOpbouw, ladeBreedtesTekst, ladeLabel, meubelAfmeting, ladeRuimte, meubelOptiesTekst, waskomTekst } from '@/lib/meubel-config'
import type { OpgeslagenMeubel } from '@/lib/meubel-opslag'
import { tekenIndeling } from '@/lib/meubel-tekening'

// PDF voor een Tailor-Made meubel, in dezelfde opmaak als de spiegeldocumenten.
//   offerte: voor de klant van de dealer, met de brutoprijs (netto × factor)
//   order:   orderbevestiging voor dealer en LoooX, met de nettoprijs
// Een meubel op aanvraag heeft in beide varianten geen prijs.

const BRAND = '#3D6B4F'
const BRAND_LIGHT = '#EAF0EC'
const GRAY = '#6B7280'
const DARK = '#111827'
const DIVIDER = '#E5E7EB'

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: DARK, padding: 40, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 10, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: BRAND,
  },
  companyName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 3 },
  companyDetails: { fontSize: 8, color: GRAY, marginTop: 1 },
  headerRight: { alignItems: 'flex-end' },
  docTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 4 },
  headerMeta: { fontSize: 8, color: GRAY, marginTop: 2 },
  section: { marginBottom: 9 },
  sectionTitle: {
    fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: BRAND, letterSpacing: 1,
    textTransform: 'uppercase', marginBottom: 6,
  },
  sectionBox: { backgroundColor: BRAND_LIGHT, borderRadius: 4, padding: 10 },
  row2: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  col: { flex: 1 },
  infoRow: { flexDirection: 'row', marginBottom: 4 },
  infoLabel: { width: 90, color: GRAY, fontSize: 8.5 },
  infoValue: { flex: 1, fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
  table: { borderWidth: 1, borderColor: DIVIDER, borderRadius: 4, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: DIVIDER, paddingHorizontal: 10, paddingVertical: 4.5 },
  tableRowLast: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 4.5 },
  tableLabel: { width: 130, color: GRAY, fontSize: 8.5 },
  tableValue: { flex: 1, fontSize: 8.5 },
  pricingBox: { backgroundColor: BRAND_LIGHT, borderRadius: 4, padding: 10 },
  pricingRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  pricingLabel: { color: GRAY, fontSize: 8.5 },
  pricingValue: { fontSize: 8.5 },
  pricingDivider: { borderTopWidth: 1, borderTopColor: BRAND, marginVertical: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  totalLabel: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: DARK },
  totalValue: { fontFamily: 'Helvetica-Bold', fontSize: 14, color: BRAND },
  notesBox: { borderWidth: 1, borderColor: DIVIDER, borderRadius: 4, padding: 10 },
  notesText: { fontSize: 8.5, color: DARK, lineHeight: 1.5 },
  // Voorwaarden als losse tekst zonder kader: zo past de offerte met zes specificatieregels en een opmerking op één pagina
  noticeText: { fontSize: 7.5, color: GRAY, lineHeight: 1.5 },
  caption: { fontSize: 7.5, color: GRAY, marginTop: 4, textAlign: 'center' },
  footer: {
    position: 'absolute', bottom: 28, left: 40, right: 40, borderTopWidth: 1, borderTopColor: DIVIDER,
    paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between',
  },
  footerText: { fontSize: 7.5, color: GRAY },
})

const STATUS_NL: Record<string, string> = {
  pending: 'In behandeling',
  confirmed: 'Bevestigd',
  shipped: 'Verzonden',
  delivered: 'Geleverd',
  cancelled: 'Geannuleerd',
}

// Afleveradres uit de bestelmodal: vijf velden met tabs ertussen (zelfde als bij spiegels)
function formatAddress(str: string): string {
  const parts = str.split('\t')
  if (parts.length !== 5) return str
  const [straat, huisnummer, woonplaats, provincie, land] = parts
  const landLabel = land === 'BE' ? 'België' : land === 'NL' ? 'Nederland' : land
  return [[straat, huisnummer].filter(Boolean).join(' '), woonplaats, provincie, landLabel].filter(Boolean).join(', ')
}

/** Bedrag met altijd twee decimalen: meubelprijzen hebben centen. */
function euro(bedrag: number): string {
  return `€ ${new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(bedrag)}`
}

// Vooraanzicht op schaal met maatlijnen, als lijntekening (zonder houtkleur)
function PdfMeubelTekening({ meubel }: { meubel: OpgeslagenMeubel }) {
  const W = 420
  const PAD_X = 40
  const PAD_TOP = 22
  const PAD_BOTTOM = 28
  const MAX_H = 72
  const ruimteB = W - PAD_X * 2 - 30
  const { model, lengte } = meubel
  const breedtes = getLadeBreedtes(meubel.ladeBreedtes, meubel.ladeRuimte, meubel.lades)
  const schaal = Math.min(ruimteB / lengte, MAX_H / model.hoogte)
  const w = lengte * schaal
  const h = model.hoogte * schaal
  const H = PAD_TOP + h + PAD_BOTTOM
  const x = (W - 30 - w) / 2
  const y = PAD_TOP
  // Zelfde indeling als de tekening op het scherm
  const { vakken, links, rechts, boven, onder, scheidingen } = tekenIndeling({
    model, breedtes, x, y, w, h, schaal,
    regaal: meubel.regaalBreedte > 0 ? { breedte: meubel.regaalBreedte, zijde: meubel.regaalZijde } : null,
  })
  const heeftRand = (model.rand ?? 0) > 0
  const rijH = (onder - boven) / model.rijen
  const lijn = { stroke: '#26282B', strokeWidth: 1 }
  const maat = { stroke: GRAY, strokeWidth: 0.6 }
  const tekst = { fontSize: 8, fill: DARK, fontFamily: 'Helvetica' }

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Rect x={x} y={y} width={w} height={h} fill="#F6F4EF" stroke="#26282B" strokeWidth={1.2} />
      {vakken.filter((v) => v.soort === 'regaal').map((v, i) => (
        <React.Fragment key={`g${i}`}>
          <Rect x={v.x0} y={boven} width={v.x1 - v.x0} height={onder - boven} fill="#D9D5CC" />
          <Rect x={v.x0 + 3} y={boven + 3} width={Math.max(0, v.x1 - v.x0 - 6)} height={Math.max(0, onder - boven - 6)} fill="none" stroke="#26282B" strokeWidth={0.5} />
        </React.Fragment>
      ))}
      {scheidingen.map((gx, i) => <Line key={`k${i}`} x1={gx} y1={boven} x2={gx} y2={onder} {...lijn} />)}
      {vakken.filter((v) => v.soort === 'lade').flatMap((v, vi) => Array.from({ length: model.rijen - 1 }, (_, i) => (
        <Line key={`r${vi}-${i}`} x1={v.x0} y1={boven + rijH * (i + 1)} x2={v.x1} y2={boven + rijH * (i + 1)} {...lijn} />
      )))}
      {model.randBoven && heeftRand && <Line x1={links} y1={boven} x2={rechts} y2={boven} {...lijn} />}
      {model.randOnder && heeftRand && <Line x1={links} y1={onder} x2={rechts} y2={onder} {...lijn} />}

      {/* Lengte */}
      <Line x1={x} y1={y - 12} x2={x + w} y2={y - 12} {...maat} />
      <Line x1={x} y1={y - 16} x2={x} y2={y - 5} {...maat} />
      <Line x1={x + w} y1={y - 16} x2={x + w} y2={y - 5} {...maat} />
      <SvgText x={x + w / 2} y={y - 16} textAnchor="middle" style={{ ...tekst, fontFamily: 'Helvetica-Bold' }}>{String(lengte)}</SvgText>

      {/* Hoogte */}
      <Line x1={x + w + 11} y1={y} x2={x + w + 11} y2={y + h} {...maat} />
      <Line x1={x + w + 5} y1={y} x2={x + w + 15} y2={y} {...maat} />
      <Line x1={x + w + 5} y1={y + h} x2={x + w + 15} y2={y + h} {...maat} />
      <SvgText x={x + w + 17} y={y + h / 2 + 3} style={{ ...tekst, fontFamily: 'Helvetica-Bold' }}>{String(model.hoogte)}</SvgText>

      {/* Per vak */}
      <Line x1={links} y1={y + h + 11} x2={rechts} y2={y + h + 11} {...maat} />
      {[links, ...vakken.map((v) => v.x1)].map((gx, i) => <Line key={`m${i}`} x1={gx} y1={y + h + 5} x2={gx} y2={y + h + 15} {...maat} />)}
      {vakken.filter((v) => v.x1 - v.x0 > 22).map((v, i) => (
        <SvgText key={`t${i}`} x={(v.x0 + v.x1) / 2} y={y + h + 24} textAnchor="middle" style={{ ...tekst, fill: GRAY }}>{formatMm(v.breedte)}</SvgText>
      ))}
    </Svg>
  )
}

export type MeubelDocumentProps = {
  variant: 'offerte' | 'order'
  projectName: string | null
  /** Offerte: datum van de configuratie. Order: besteldatum. */
  date: string
  articleNumber?: string | null
  orderNumber?: string
  status?: string
  dealer: {
    name: string | null
    company: string | null
    email: string
    phone?: string | null
    address?: string | null
    shippingAddress?: string | null
  }
  meubel: OpgeslagenMeubel
  /** Per stuk in euro: bruto bij de offerte, netto bij de order */
  unitPrice: number
  quantity: number
  notes?: string | null
  /** Maattekening voor de uitsparingen, al omgezet voor de PDF (data-URL) */
  attachmentUrl?: string | null
}

export default function MeubelDocument({
  variant, projectName, date, articleNumber, orderNumber, status, dealer, meubel, unitPrice, quantity, notes, attachmentUrl,
}: MeubelDocumentProps) {
  const isOrder = variant === 'order'
  const { model } = meubel
  const opAanvraag = meubel.opAanvraag
  const docTitle = !isOrder ? 'Offerte' : opAanvraag ? 'Offerteaanvraag' : 'Orderbevestiging'
  const today = formatDate(new Date().toISOString())
  const subtotaal = Math.round(unitPrice * quantity * 100) / 100
  const btw = Math.round(subtotaal * 21) / 100
  const inclBtw = Math.round((subtotaal + btw) * 100) / 100
  // Order: bruto, korting en netto, net als bij spiegels. Bruto volgt uit de factor van de offerte.
  const opbouw = getMeubelOrderOpbouw(Math.round(unitPrice * 100), meubel.factor)
  const footerLinks = isOrder ? 'LoooX' : `${dealer.company ?? dealer.name ?? ''} - ${dealer.email}`
  const footerRechts = isOrder ? `${docTitle} ${orderNumber ?? ''}` : `Offerte ${projectName ?? ''} - ${today}`

  const specs: [string, string][] = [
    ['Model', model.naam],
    ['Afmeting', meubelAfmeting(model, meubel.lengte)],
    ['Lades', `${ladeLabel(model, meubel.lades)} · ${ladeBreedtesTekst(meubel.ladeBreedtes, meubel.ladeRuimte, meubel.lades)}`],
    ...(meubel.waskomVorm ? [['Waskom', waskomTekst(meubel)] as [string, string]] : []),
    ...(meubel.regaalBreedte > 0 ? [['Regaalkast', `${meubel.regaalBreedte} mm breed, ${meubel.regaalZijde}`] as [string, string]] : []),
    ...(model.rand ? [['Rand', `${model.rand} mm ${model.randOnder ? 'rondom' : model.randBoven ? 'links, rechts en boven' : 'links en rechts'}`] as [string, string]] : []),
    ['Houtkleur', meubel.houtkleurNaam || '—'],
    ['Opties', meubelOptiesTekst(meubel)],
    ...(opAanvraag ? [['Bijzonderheid', 'Groter dan de standaardmaten, op aanvraag'] as [string, string]] : []),
  ]

  return (
    <Document
      title={isOrder ? `${docTitle} ${orderNumber ?? ''}` : `Offerte — ${projectName ?? 'Meubel'}`}
      author={isOrder ? 'LoooX' : (dealer.company ?? dealer.name ?? 'LoooX dealer')}
      creator="LoooX Configurator"
    >
      <Page size="A4" style={styles.page}>
        <View style={{ alignItems: 'center', marginBottom: 4 }}>
          <PdfLogo />
        </View>

        {isOrder ? (
          <>
            <View style={styles.header}>
              <View>
                <Text style={styles.headerMeta}>Tailor-Made meubel</Text>
              </View>
              <View style={styles.headerRight}>
                <Text style={styles.docTitle}>{docTitle}</Text>
                <Text style={styles.headerMeta}>Datum: {formatDate(date)}</Text>
                {status && <Text style={styles.headerMeta}>Status: {STATUS_NL[status] ?? status}</Text>}
              </View>
            </View>
            <View style={styles.row2}>
              <View style={styles.col}>
                <Text style={styles.sectionTitle}>Dealer</Text>
                <View style={styles.sectionBox}>
                  <Info label="Bedrijf" value={dealer.company ?? '—'} />
                  <Info label="Naam" value={dealer.name ?? '—'} />
                  <Info label="E-mail" value={dealer.email} />
                  {dealer.phone && <Info label="Telefoon" value={dealer.phone} />}
                  {dealer.address && <Info label="Adres" value={formatAddress(dealer.address)} />}
                  {dealer.shippingAddress && <Info label="Afleveradres" value={formatAddress(dealer.shippingAddress)} />}
                </View>
              </View>
              <View style={styles.col}>
                <Text style={styles.sectionTitle}>Project</Text>
                <View style={styles.sectionBox}>
                  <Info label={opAanvraag ? 'Offertenummer' : 'Ordernummer'} value={orderNumber ?? '—'} />
                  <Info label="Projectnaam" value={projectName ?? '—'} />
                  {meubel.reference && <Info label="Referentie" value={meubel.reference} />}
                  {articleNumber && <Info label="Artikelnummer" value={articleNumber} />}
                  <Info label="Aantal" value={`${quantity}×`} />
                </View>
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={styles.header}>
              <View>
                <Text style={styles.companyName}>{dealer.company ?? dealer.name ?? 'Uw leverancier'}</Text>
                {dealer.address && <Text style={styles.companyDetails}>{formatAddress(dealer.address)}</Text>}
                {dealer.phone && <Text style={styles.companyDetails}>{dealer.phone}</Text>}
                <Text style={styles.companyDetails}>{dealer.email}</Text>
              </View>
              <View style={styles.headerRight}>
                <Text style={styles.docTitle}>Offerte</Text>
                <Text style={styles.headerMeta}>Datum: {today}</Text>
              </View>
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Project</Text>
              <View style={styles.sectionBox}>
                {articleNumber && <Info label="Artikelnummer" value={articleNumber} />}
                <Info label="Projectnaam" value={projectName ?? '—'} />
                {meubel.reference && <Info label="Referentie" value={meubel.reference} />}
                <Info label="Geconfigureerd op" value={formatDate(date)} />
                <Info label="Aantal" value={`${quantity}×`} />
              </View>
            </View>
          </>
        )}

        {/* Tekening */}
        <View style={[styles.section, { alignItems: 'center' }]} wrap={false}>
          <PdfMeubelTekening meubel={meubel} />
          <Text style={styles.caption}>Vooraanzicht, maten in mm</Text>
        </View>

        {/* Specificatie */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Specificatie meubel</Text>
          <View style={styles.table}>
            {specs.map(([label, value], i) => (
              <View key={label} style={i === specs.length - 1 ? styles.tableRowLast : styles.tableRow}>
                <Text style={styles.tableLabel}>{label}</Text>
                <Text style={styles.tableValue}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Prijs */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>{!isOrder ? 'Prijsoverzicht' : opAanvraag ? 'Prijs' : 'Prijsoverzicht (excl. BTW)'}</Text>
          <View style={styles.pricingBox}>
            {opAanvraag ? (
              <>
                <Prijs label="Prijs" value="Op aanvraag" />
                <Prijs label="Aantal" value={`${quantity}×`} />
              </>
            ) : isOrder ? (
              <>
                <Prijs label="Bruto ex. BTW" value={euro(opbouw.brutoCents / 100)} grijs />
                <Prijs label={`Dealer korting (${formatPct(opbouw.kortingPct)})`} value={`-${euro(opbouw.kortingCents / 100)}`} grijs />
                <Prijs label="Netto ex. BTW" value={euro(unitPrice)} />
                <Prijs label="Aantal" value={`${quantity}×`} />
                <View style={styles.pricingDivider} />
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Totaal</Text>
                  <Text style={styles.totalValue}>{euro(subtotaal)}</Text>
                </View>
                <Text style={{ fontSize: 7.5, color: GRAY, marginTop: 4, textAlign: 'right' }}>Alle prijzen excl. BTW</Text>
              </>
            ) : (
              <>
                <Prijs label="Prijs per stuk (excl. btw)" value={euro(unitPrice)} />
                <Prijs label="Aantal" value={`${quantity}×`} />
                <Prijs label="Subtotaal excl. btw" value={euro(subtotaal)} />
                <Prijs label="BTW 21%" value={euro(btw)} />
                <View style={styles.pricingDivider} />
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Totaal incl. btw</Text>
                  <Text style={styles.totalValue}>{euro(inclBtw)}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Opmerking uit de configuratie, en bij een order de opmerking bij het bestellen */}
        {meubel.description && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Bijzonderheden</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{meubel.description}</Text>
            </View>
          </View>
        )}
        {isOrder && notes && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Opmerking bij de bestelling</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{notes}</Text>
            </View>
          </View>
        )}

        {!isOrder && (
          <Text style={styles.noticeText}>
            {opAanvraag
              ? 'Dit meubel is groter dan de standaardmaten en wordt op aanvraag gemaakt. De prijs volgt na beoordeling van de aanvraag. De levertijd van maatwerkmeubels is 8 tot 12 weken.'
              : 'Deze offerte is 30 dagen geldig. Prijzen zijn excl. btw, tenzij anders vermeld. Het totaalbedrag is inclusief 21% btw. Onder voorbehoud van beschikbaarheid. De levertijd van maatwerkmeubels is 8 tot 12 weken.'}
          </Text>
        )}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{footerLinks}</Text>
          <Text style={styles.footerText}>{footerRechts}</Text>
        </View>
      </Page>

      {/* Bijlage: maattekening voor de uitsparingen */}
      {attachmentUrl && (
        <Page size="A4" style={styles.page}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: DARK }}>Bijlage - Maattekening uitsparingen</Text>
            <Text style={{ fontSize: 8, color: GRAY }}>{projectName ?? ''}</Text>
          </View>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={attachmentUrl} style={{ width: 515, height: 690, objectFit: 'contain' }} />
          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>{footerLinks}</Text>
            <Text style={styles.footerText}>{footerRechts} - Bijlage</Text>
          </View>
        </Page>
      )}
    </Document>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

function Prijs({ label, value, grijs = false }: { label: string; value: string; grijs?: boolean }) {
  return (
    <View style={styles.pricingRow}>
      <Text style={styles.pricingLabel}>{label}</Text>
      <Text style={grijs ? [styles.pricingValue, { color: GRAY }] : styles.pricingValue}>{value}</Text>
    </View>
  )
}
