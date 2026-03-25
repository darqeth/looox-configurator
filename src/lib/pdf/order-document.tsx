import React from 'react'
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'
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
  logo: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: BRAND,
    letterSpacing: 2,
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

  // Two columns
  row2: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  col: {
    flex: 1,
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

  // Specs table
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

  // Pricing box
  pricingBox: {
    backgroundColor: BRAND_LIGHT,
    borderRadius: 4,
    padding: 12,
    marginTop: 4,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
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
    marginVertical: 6,
  },
  totalLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: DARK,
  },
  totalValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    color: BRAND,
  },
  vatNote: {
    fontSize: 7.5,
    color: GRAY,
    marginTop: 3,
    textAlign: 'right',
  },

  // Notes
  notesBox: {
    borderWidth: 1,
    borderColor: DIVIDER,
    borderRadius: 4,
    padding: 10,
    marginTop: 4,
  },
  notesText: {
    fontSize: 8.5,
    color: DARK,
    lineHeight: 1.5,
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

export type OrderDocumentProps = {
  orderNumber: string
  orderDate: string
  articleNumber?: string | null
  status: string
  dealer: {
    name: string | null
    company: string | null
    email: string
    phone?: string | null
    address?: string | null
  }
  config: {
    name: string | null
    width: number | null
    height: number | null
    options: ConfigOptions
  }
  unitPrice: number
  totalPrice: number
  quantity: number
  notes?: string | null
  attachmentUrl?: string | null
}

const STATUS_NL: Record<string, string> = {
  pending: 'In behandeling',
  confirmed: 'Bevestigd',
  shipped: 'Verzonden',
  delivered: 'Geleverd',
  cancelled: 'Geannuleerd',
}

export default function OrderDocument({
  orderNumber, orderDate, articleNumber, status,
  dealer, config, unitPrice, totalPrice, quantity, notes, attachmentUrl,
}: OrderDocumentProps) {
  const opts = config.options

  return (
    <Document
      title={`Orderbevestiging ${orderNumber}`}
      author="LoooX"
      creator="LoooX Configurator"
    >
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>LoooX</Text>
            <Text style={[styles.headerMeta, { marginTop: 4 }]}>Spiegel op maat</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>Orderbevestiging</Text>
            <Text style={styles.headerMeta}>Ordernummer: {orderNumber}</Text>
            <Text style={styles.headerMeta}>Datum: {formatDate(orderDate)}</Text>
            <Text style={styles.headerMeta}>Status: {STATUS_NL[status] ?? status}</Text>
          </View>
        </View>

        {/* Dealer + Config info naast elkaar */}
        <View style={styles.row2}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Dealer</Text>
            <View style={styles.sectionBox}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Bedrijf</Text>
                <Text style={styles.infoValue}>{dealer.company ?? '—'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Naam</Text>
                <Text style={styles.infoValue}>{dealer.name ?? '—'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>E-mail</Text>
                <Text style={styles.infoValue}>{dealer.email}</Text>
              </View>
              {dealer.phone && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Telefoon</Text>
                  <Text style={styles.infoValue}>{dealer.phone}</Text>
                </View>
              )}
              {dealer.address && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Adres</Text>
                  <Text style={styles.infoValue}>{dealer.address}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Project</Text>
            <View style={styles.sectionBox}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Projectnaam</Text>
                <Text style={styles.infoValue}>{config.name ?? '—'}</Text>
              </View>
              {opts.reference && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Referentie</Text>
                  <Text style={styles.infoValue}>{opts.reference}</Text>
                </View>
              )}
              {articleNumber && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Artikelnummer</Text>
                  <Text style={styles.infoValue}>{articleNumber}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Aantal</Text>
                <Text style={styles.infoValue}>{quantity}×</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Specificaties */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Specificatie</Text>
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
          <Text style={styles.sectionTitle}>Prijsoverzicht (netto, excl. BTW)</Text>
          <View style={styles.pricingBox}>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Eenheidsprijs</Text>
              <Text style={styles.pricingValue}>{formatPrice(unitPrice)}</Text>
            </View>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Aantal</Text>
              <Text style={styles.pricingValue}>{quantity}×</Text>
            </View>
            <View style={styles.pricingDivider} />
            <View style={styles.pricingRow}>
              <Text style={styles.totalLabel}>Totaal</Text>
              <Text style={styles.totalValue}>{formatPrice(totalPrice)}</Text>
            </View>
            <Text style={styles.vatNote}>Alle prijzen excl. BTW - Netto inkoopprijs</Text>
          </View>
        </View>

        {/* Bijzonderheden */}
        {(notes || opts.description) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bijzonderheden</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{notes ?? opts.description}</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>LoooX - Spiegel op maat - info@looox.nl</Text>
          <Text style={styles.footerText}>{orderNumber} - {formatDate(orderDate)}</Text>
        </View>

      </Page>

      {/* Bijlage: maattekening schuine zijden */}
      {attachmentUrl && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <View>
              <Text style={styles.logo}>LoooX</Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.docTitle}>Bijlage - Maattekening</Text>
              <Text style={styles.headerMeta}>Ordernummer: {orderNumber}</Text>
              <Text style={styles.headerMeta}>{config.name ?? ''}</Text>
            </View>
          </View>
          <Image
            src={attachmentUrl}
            style={{ width: '100%', objectFit: 'contain', maxHeight: 680 }}
          />
          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>LoooX - Spiegel op maat - info@looox.nl</Text>
            <Text style={styles.footerText}>{orderNumber} - Bijlage maattekening</Text>
          </View>
        </Page>
      )}

    </Document>
  )
}
