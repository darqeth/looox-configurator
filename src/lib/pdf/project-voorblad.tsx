import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { PdfLogo } from './pdf-logo'
import { formatDate } from './helpers'
import type { ProjectRegel } from '@/lib/project'

// Voorblad van een projectofferte of -order: alle regels met het totaal. Daarachter
// komen de bestaande documenten per regel, samengevoegd tot één PDF.

const BRAND = '#3D6B4F'
const BRAND_LIGHT = '#EAF0EC'
const GRAY = '#6B7280'
const DARK = '#111827'
const DIVIDER = '#E5E7EB'

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: DARK, padding: 40, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 14, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: BRAND,
  },
  companyName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 3 },
  companyDetails: { fontSize: 8, color: GRAY, marginTop: 1 },
  docTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 4 },
  headerMeta: { fontSize: 8, color: GRAY, marginTop: 2 },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: BRAND, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  sectionBox: { backgroundColor: BRAND_LIGHT, borderRadius: 4, padding: 10 },
  infoRow: { flexDirection: 'row', marginBottom: 4 },
  infoLabel: { width: 90, color: GRAY, fontSize: 8.5 },
  infoValue: { flex: 1, fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
  table: { borderWidth: 1, borderColor: DIVIDER, borderRadius: 4 },
  th: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: DIVIDER, paddingHorizontal: 10, paddingVertical: 6 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: DIVIDER, paddingHorizontal: 10, paddingVertical: 7 },
  trLast: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 7 },
  cNr: { width: 22, fontSize: 8.5, color: GRAY },
  cProduct: { flex: 1, paddingRight: 8 },
  cAantal: { width: 44, textAlign: 'right', fontSize: 8.5 },
  cStuk: { width: 78, textAlign: 'right', fontSize: 8.5 },
  cTotaal: { width: 82, textAlign: 'right', fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
  thText: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: GRAY, textTransform: 'uppercase', letterSpacing: 0.5 },
  productTitel: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  productOmschrijving: { fontSize: 8, color: GRAY, marginTop: 2 },
  pricingBox: { backgroundColor: BRAND_LIGHT, borderRadius: 4, padding: 12, marginLeft: 'auto', width: 260 },
  pricingRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  pricingLabel: { color: GRAY, fontSize: 8.5 },
  pricingValue: { fontSize: 8.5 },
  pricingDivider: { borderTopWidth: 1, borderTopColor: BRAND, marginVertical: 7 },
  totalLabel: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: DARK },
  totalValue: { fontFamily: 'Helvetica-Bold', fontSize: 14, color: BRAND },
  notice: { fontSize: 8, color: GRAY, lineHeight: 1.6 },
  footer: {
    position: 'absolute', bottom: 28, left: 40, right: 40, borderTopWidth: 1, borderTopColor: DIVIDER,
    paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between',
  },
  footerText: { fontSize: 7.5, color: GRAY },
})

function euro(cents: number): string {
  return `€ ${new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100)}`
}

export type ProjectVoorbladProps = {
  /** offerte: voor de klant van de dealer, met btw. order: bevestiging met netto regels. */
  variant: 'offerte' | 'order'
  projectNaam: string
  referentie: string
  /** Order: het gezamenlijke ordernummer */
  orderNummer?: string
  datum: string
  dealer: { name: string | null; company: string | null; email: string; phone?: string | null; address?: string | null }
  regels: ProjectRegel[]
}

export default function ProjectVoorblad({ variant, projectNaam, referentie, orderNummer, datum, dealer, regels }: ProjectVoorbladProps) {
  const isOrder = variant === 'order'
  const totaal = regels.reduce((som, r) => som + r.totaalCents, 0)
  const btw = Math.round(totaal * 0.21)
  const opAanvraag = regels.filter((r) => r.opAanvraag).length
  const titel = isOrder ? 'Orderbevestiging' : 'Offerte'

  return (
    <Document title={`${titel} ${orderNummer ?? projectNaam}`} author={isOrder ? 'LoooX' : (dealer.company ?? dealer.name ?? 'LoooX dealer')} creator="LoooX Configurator">
      <Page size="A4" style={styles.page}>
        <View style={{ alignItems: 'center', marginBottom: 4 }}>
          <PdfLogo />
        </View>

        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{dealer.company ?? dealer.name ?? 'Uw leverancier'}</Text>
            {dealer.address && <Text style={styles.companyDetails}>{dealer.address.split('\t').filter(Boolean).join(' ')}</Text>}
            {dealer.phone && <Text style={styles.companyDetails}>{dealer.phone}</Text>}
            <Text style={styles.companyDetails}>{dealer.email}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.docTitle}>{titel}</Text>
            <Text style={styles.headerMeta}>Datum: {formatDate(datum)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project</Text>
          <View style={styles.sectionBox}>
            {orderNummer && (
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Ordernummer</Text><Text style={styles.infoValue}>{orderNummer}</Text></View>
            )}
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Projectnaam</Text><Text style={styles.infoValue}>{projectNaam}</Text></View>
            {referentie ? (
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Referentie</Text><Text style={styles.infoValue}>{referentie}</Text></View>
            ) : null}
            <View style={styles.infoRow}><Text style={styles.infoLabel}>Aantal regels</Text><Text style={styles.infoValue}>{regels.length}</Text></View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overzicht</Text>
          <View style={styles.table}>
            <View style={styles.th}>
              <Text style={[styles.cNr, styles.thText]}>Nr</Text>
              <Text style={[styles.cProduct, styles.thText]}>Product</Text>
              <Text style={[styles.cAantal, styles.thText]}>Aantal</Text>
              <Text style={[styles.cStuk, styles.thText]}>Per stuk</Text>
              <Text style={[styles.cTotaal, styles.thText]}>Totaal</Text>
            </View>
            {regels.map((r, i) => (
              <View key={r.id} style={i === regels.length - 1 ? styles.trLast : styles.tr} wrap={false}>
                <Text style={styles.cNr}>{i + 1}</Text>
                <View style={styles.cProduct}>
                  <Text style={styles.productTitel}>{r.titel}</Text>
                  <Text style={styles.productOmschrijving}>{r.omschrijving}</Text>
                </View>
                <Text style={styles.cAantal}>{r.quantity}×</Text>
                <Text style={styles.cStuk}>{r.opAanvraag ? '' : euro(r.stukCents)}</Text>
                <Text style={styles.cTotaal}>{r.opAanvraag ? 'Op aanvraag' : euro(r.totaalCents)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section} wrap={false}>
          <View style={styles.pricingBox}>
            {isOrder ? (
              <View style={[styles.pricingRow, { marginBottom: 0, alignItems: 'baseline' }]}>
                <Text style={styles.totalLabel}>Totaal netto excl. btw</Text>
                <Text style={styles.totalValue}>{euro(totaal)}</Text>
              </View>
            ) : (
              <>
                <View style={styles.pricingRow}><Text style={styles.pricingLabel}>Subtotaal excl. btw</Text><Text style={styles.pricingValue}>{euro(totaal)}</Text></View>
                <View style={styles.pricingRow}><Text style={styles.pricingLabel}>BTW 21%</Text><Text style={styles.pricingValue}>{euro(btw)}</Text></View>
                <View style={styles.pricingDivider} />
                <View style={[styles.pricingRow, { marginBottom: 0, alignItems: 'baseline' }]}>
                  <Text style={styles.totalLabel}>Totaal incl. btw</Text>
                  <Text style={styles.totalValue}>{euro(totaal + btw)}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        <Text style={styles.notice}>
          {opAanvraag > 0 ? `${opAanvraag === 1 ? 'Eén regel is' : `${opAanvraag} regels zijn`} op aanvraag en ${opAanvraag === 1 ? 'telt' : 'tellen'} niet mee in het totaal; de prijs volgt na beoordeling. ` : ''}
          Op de volgende pagina&apos;s staat de specificatie per product.
          {isOrder ? '' : ' Deze offerte is 30 dagen geldig. Prijzen zijn excl. btw, tenzij anders vermeld.'}
        </Text>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{isOrder ? 'LoooX' : `${dealer.company ?? dealer.name ?? ''} - ${dealer.email}`}</Text>
          <Text style={styles.footerText}>{titel} {orderNummer ?? projectNaam}</Text>
        </View>
      </Page>
    </Document>
  )
}
