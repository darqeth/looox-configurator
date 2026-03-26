import React from 'react'
import {
  Document,
  Page,
  View,
  Text,
  Image,
  Svg,
  Path,
  Polygon,
  StyleSheet,
} from '@react-pdf/renderer'

function LoooXLogo({ width = 80, color = '#3D6B4F' }: { width?: number; color?: string }) {
  const height = Math.round(80.89 * (width / 197.23))
  return (
    <Svg viewBox="0 0 197.23 80.89" style={{ width, height }}>
      <Polygon fill={color} points="27,32.38 27,49.07 43.41,49.07 43.41,45.92 30.9,45.92 30.9,32.38" />
      <Path fill={color} d="M52.97,45.92h12.82V35.34H52.97V45.92z M49.06,36.33c0-1.55,0.29-2.6,0.88-3.14c0.58-0.54,1.67-0.81,3.28-0.81h12.32c1.6,0,2.69,0.27,3.27,0.81c0.58,0.54,0.88,1.58,0.88,3.14v8.79c0,1.55-0.29,2.6-0.88,3.14c-0.58,0.54-1.67,0.81-3.27,0.81H53.22c-1.6,0-2.7-0.27-3.28-0.81c-0.59-0.54-0.88-1.59-0.88-3.14V36.33z" />
      <Path fill={color} d="M81.7,45.92h12.82V35.34H81.7V45.92z M77.8,36.33c0-1.55,0.29-2.6,0.88-3.14c0.58-0.54,1.68-0.81,3.27-0.81h12.32c1.6,0,2.69,0.27,3.27,0.81c0.58,0.54,0.88,1.58,0.88,3.14v8.79c0,1.55-0.29,2.6-0.88,3.14c-0.58,0.54-1.67,0.81-3.27,0.81H81.95c-1.6,0-2.69-0.27-3.27-0.81c-0.59-0.54-0.88-1.59-0.88-3.14V36.33z" />
      <Path fill={color} d="M110.43,45.92h12.82V35.34h-12.82V45.92z M106.53,36.33c0-1.55,0.29-2.6,0.88-3.14c0.59-0.54,1.67-0.81,3.27-0.81h12.32c1.6,0,2.69,0.27,3.27,0.81c0.58,0.54,0.88,1.58,0.88,3.14v8.79c0,1.55-0.29,2.6-0.88,3.14c-0.58,0.54-1.68,0.81-3.27,0.81h-12.32c-1.6,0-2.69-0.27-3.27-0.81c-0.58-0.54-0.88-1.59-0.88-3.14V36.33z" />
      <Path fill={color} d="M166.49,18.16c-1.1,1.1-11.66,12.54-11.66,12.54c-3.85,4.01-6.49,6.14-8.38,6.14c-0.04,0-0.08,0-0.12,0c-1.82-0.09-2.9-1.24-4.77-4.51c-2.3-4.02-3.83-7.16-4.98-9.1c-2.04-3.2-3.63-4.8-5.35-4.8c-1.16,0-2.01,0.32-2.46,1.14c-0.63,1.16-1.32,3.61,2.39,7.59c3.15,3.39,4.96,5.69,5.75,6.85c1.99,2.83,3.38,4.41,2.67,7.16c-0.49,1.88-6.97,9.77-9.26,11.74c-1.36,1.36-5.5,3.79-8.63,6.71c-3.01,2.81-0.96,5.58,1.51,5.58c4.17,0,6.26-3.71,6.77-4.67c1.82-3.45,5.01-8.16,6.43-9.88c2.5-3.05,4.75-4.06,6.18-4.06c2.09,0,5.3,0.66,6.39,6.83c1.28,5.87-0.43,10,1.55,11.98c1.06,1.06,2.27,1.49,3.45,1.49c2.83,0,5.49-2.49,5.49-4.74c0-3.98-3.07-5.76-6.37-10.07c-3.65-4.75-4.02-7.4-3.83-9.74c0.14-1.73,1.3-3.94,5.04-6.76c4.66-3.53,7.33-5.34,9.75-7.4c1.64-1.39,2.85-2.79,4.37-4.93c1.67-2.35,2.57-5.37,1.17-6.14c-0.22-0.13-0.46-0.18-0.71-0.18C167.96,16.93,166.98,17.68,166.49,18.16" />
    </Svg>
  )
}
import {
  ConfigOptions,
  formatShape,
  formatDimensions,
  formatGlas,
  formatLight,
  formatExtras,
  formatDate,
  formatPrice,
} from './helpers'

const BRAND = '#3D6B4F'
const BRAND_LIGHT = '#EAF0EC'
const GRAY = '#6B7280'
const DARK = '#111827'
const DIVIDER = '#E5E7EB'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: DARK,
    padding: 40,
    backgroundColor: '#FFFFFF',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: BRAND,
  },
  companyName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    marginBottom: 3,
  },
  companyDetails: {
    fontSize: 8,
    color: GRAY,
    marginTop: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  docTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    marginBottom: 4,
  },
  headerMeta: {
    fontSize: 8,
    color: GRAY,
    marginTop: 2,
  },

  // Section
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: BRAND,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sectionBox: {
    backgroundColor: BRAND_LIGHT,
    borderRadius: 4,
    padding: 10,
  },

  // Spec table
  table: {
    borderWidth: 1,
    borderColor: DIVIDER,
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tableRowLast: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tableLabel: {
    width: 130,
    color: GRAY,
    fontSize: 8.5,
  },
  tableValue: {
    flex: 1,
    fontSize: 8.5,
  },

  // Pricing
  pricingBox: {
    backgroundColor: BRAND_LIGHT,
    borderRadius: 4,
    padding: 14,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  pricingLabel: {
    color: GRAY,
    fontSize: 8.5,
  },
  pricingValue: {
    fontSize: 8.5,
  },
  pricingDivider: {
    borderTopWidth: 1,
    borderTopColor: BRAND,
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  totalLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: DARK,
  },
  totalValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
    color: BRAND,
  },
  vatNote: {
    fontSize: 7.5,
    color: GRAY,
    marginTop: 4,
    textAlign: 'right',
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    width: 110,
    color: GRAY,
    fontSize: 8.5,
  },
  infoValue: {
    flex: 1,
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
  },

  // Notes
  notesBox: {
    borderWidth: 1,
    borderColor: DIVIDER,
    borderRadius: 4,
    padding: 10,
  },
  notesText: {
    fontSize: 8.5,
    color: DARK,
    lineHeight: 1.5,
  },

  // Validity notice
  noticeBox: {
    borderWidth: 1,
    borderColor: DIVIDER,
    borderRadius: 4,
    padding: 10,
    backgroundColor: '#F9FAFB',
  },
  noticeText: {
    fontSize: 8,
    color: GRAY,
    lineHeight: 1.6,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7.5,
    color: GRAY,
  },
})

export type OfferteDocumentProps = {
  configName: string | null
  configDate: string
  articleNumber?: string | null
  dealer: {
    name: string | null
    company: string | null
    email: string
    phone?: string | null
    address?: string | null
  }
  config: {
    width: number | null
    height: number | null
    options: ConfigOptions
  }
  unitPrice: number
  totalPrice: number
  quantity: number
  priceFactor: number
  priceFactorEnabled: boolean
  attachmentUrl?: string | null
}

export default function OfferteDocument({
  configName, configDate, articleNumber,
  dealer, config, unitPrice, totalPrice, quantity,
  priceFactor, priceFactorEnabled, attachmentUrl,
}: OfferteDocumentProps) {
  const opts = config.options
  const showConsumer = priceFactorEnabled && priceFactor > 1
  const consumerUnit = showConsumer ? Math.round(unitPrice * priceFactor) : unitPrice
  const consumerTotal = showConsumer ? Math.round(totalPrice * priceFactor) : totalPrice

  const today = formatDate(new Date().toISOString())

  return (
    <Document
      title={`Offerte — ${configName ?? 'Configuratie'}`}
      author={dealer.company ?? dealer.name ?? 'LoooX dealer'}
      creator="LoooX Configurator"
    >
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{dealer.company ?? dealer.name ?? 'Uw leverancier'}</Text>
            {dealer.address && <Text style={styles.companyDetails}>{dealer.address}</Text>}
            {dealer.phone && <Text style={styles.companyDetails}>{dealer.phone}</Text>}
            <Text style={styles.companyDetails}>{dealer.email}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>Offerte</Text>
            <Text style={styles.headerMeta}>Datum: {today}</Text>
            {opts.reference && (
              <Text style={styles.headerMeta}>Referentie: {opts.reference}</Text>
            )}
            {articleNumber && (
              <Text style={styles.headerMeta}>Artikelnummer: {articleNumber}</Text>
            )}
          </View>
        </View>

        {/* Project */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project</Text>
          <View style={styles.sectionBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Projectnaam</Text>
              <Text style={styles.infoValue}>{configName ?? '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Geconfigureerd op</Text>
              <Text style={styles.infoValue}>{formatDate(configDate)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Aantal</Text>
              <Text style={styles.infoValue}>{quantity}×</Text>
            </View>
          </View>
        </View>

        {/* Specificaties */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spiegelspecificatie</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Vorm</Text>
              <Text style={styles.tableValue}>{formatShape(opts.shape)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Afmeting</Text>
              <Text style={styles.tableValue}>
                {formatDimensions(opts.shape, config.width, config.height, opts)}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Glas</Text>
              <Text style={styles.tableValue}>{formatGlas(opts.glasKleur)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Directe verlichting</Text>
              <Text style={styles.tableValue}>{formatLight(opts.directLight)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Indirecte verlichting</Text>
              <Text style={styles.tableValue}>{formatLight(opts.indirectLight)}</Text>
            </View>
            <View style={styles.tableRowLast}>
              <Text style={styles.tableLabel}>Extra opties</Text>
              <Text style={styles.tableValue}>
                {formatExtras(opts.extras, opts.optionSubChoices)}
              </Text>
            </View>
          </View>
        </View>

        {/* Prijs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prijsoverzicht</Text>
          <View style={styles.pricingBox}>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Prijs per stuk</Text>
              <Text style={styles.pricingValue}>{formatPrice(consumerUnit)}</Text>
            </View>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Aantal</Text>
              <Text style={styles.pricingValue}>{quantity}×</Text>
            </View>
            <View style={styles.pricingDivider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Totaal</Text>
              <Text style={styles.totalValue}>{formatPrice(consumerTotal)}</Text>
            </View>
            <Text style={styles.vatNote}>Alle prijzen excl. BTW</Text>
          </View>
        </View>

        {/* Bijzonderheden */}
        {opts.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bijzonderheden</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{opts.description}</Text>
            </View>
          </View>
        )}

        {/* Geldigheid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voorwaarden</Text>
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>
              Deze offerte is 30 dagen geldig. Prijzen zijn excl. BTW en onder voorbehoud van beschikbaarheid.
              Productietijd na akkoord is ca. 10 werkdagen. Neem contact op voor vragen of bestelling.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{dealer.company ?? dealer.name ?? ''} - {dealer.email}</Text>
          <Text style={styles.footerText}>Offerte {configName ?? ''} - {today}</Text>
        </View>

      </Page>

      {/* Bijlage: maattekening schuine zijden */}
      {attachmentUrl && (
        <Page size="A4" style={styles.page}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <LoooXLogo width={60} />
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: DARK }}>Bijlage - Maattekening</Text>
              <Text style={{ fontSize: 8, color: GRAY, marginTop: 2 }}>{configName ?? ''}</Text>
            </View>
          </View>
          <Image
            src={attachmentUrl}
            style={{ width: 515, height: 690, objectFit: 'contain' }}
          />
          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>{dealer.company ?? dealer.name ?? ''} - {dealer.email}</Text>
            <Text style={styles.footerText}>Offerte {configName ?? ''} - Bijlage maattekening</Text>
          </View>
        </Page>
      )}

    </Document>
  )
}
