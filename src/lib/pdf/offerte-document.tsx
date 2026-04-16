import React from 'react'
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Svg,
  Rect,
  Path,
  Circle,
  Line,
  Defs,
  ClipPath,
  G,
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

// ─── PDF Mirror Preview ───────────────────────────────────────────────────────

const GLASS_FILL: Record<string, { fill: string; fillOpacity: number; stroke: string }> = {
  'helder':      { fill: '#C8D4DC', fillOpacity: 0.55, stroke: '#A8B4BC' },
  'smoke-grijs': { fill: '#5A6068', fillOpacity: 0.80, stroke: '#464C54' },
  'smoke-zwart': { fill: '#18191C', fillOpacity: 0.92, stroke: '#2C2E33' },
}

function PdfMirrorPreview({ opts, width: configWidth, height: configHeight }: {
  opts: ConfigOptions
  width: number | null
  height: number | null
}) {
  const SIZE = 110
  const PAD = 14
  const available = SIZE - PAD * 2
  const shape = opts.shape ?? 'rechthoek'
  const glasKleur = (opts.glasKleur as string) ?? 'helder'
  const glass = GLASS_FILL[glasKleur] ?? GLASS_FILL['helder']
  const directPos = (opts.directLight as { position?: string } | null)?.position ?? 'geen'
  const indirectPos = (opts.indirectLight as { position?: string } | null)?.position ?? 'geen'

  const w0 = configWidth ?? 80
  const h0 = configHeight ?? 60
  const ratio = Math.min(available / w0, available / h0)
  const w = Math.round(w0 * ratio)
  const h = Math.round(h0 * ratio)
  const x = (SIZE - w) / 2
  const y = (SIZE - h) / 2

  const hasDirect   = directPos !== 'geen'
  const hasIndirect = indirectPos !== 'geen'
  const GLOW = '#FEF3C7'
  const GLOW_W = 5

  if (shape === 'rond') {
    const r = Math.min(available / 2, (opts.diameter as number ?? 60) * 0.95 * ratio)
    const cx2 = SIZE / 2
    const cy2 = SIZE / 2
    return (
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {hasIndirect && <Circle cx={cx2} cy={cy2} r={r + 4} fill="none" stroke={GLOW} strokeWidth={GLOW_W} opacity={0.7} />}
        <Circle cx={cx2} cy={cy2} r={r} fill={glass.fill} fillOpacity={glass.fillOpacity} />
        <Circle cx={cx2} cy={cy2} r={r} fill="none" stroke={glass.stroke} strokeWidth="1.2" />
        {hasDirect && <Circle cx={cx2} cy={cy2} r={r * 0.82} fill="none" stroke="white" strokeWidth="3" opacity={0.45} />}
        <Line x1={cx2 - r*0.15} y1={cy2 - r*0.45} x2={cx2 + r*0.25} y2={cy2 + r*0.35} stroke="white" strokeWidth="5" opacity={0.09} strokeLinecap="round" />
      </Svg>
    )
  }

  if (shape === 'ovaal') {
    const rx = h / 2
    return (
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {hasIndirect && <Rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} rx={rx + 4} fill="none" stroke={GLOW} strokeWidth={GLOW_W} opacity={0.7} />}
        <Rect x={x} y={y} width={w} height={h} rx={rx} fill={glass.fill} fillOpacity={glass.fillOpacity} />
        <Rect x={x} y={y} width={w} height={h} rx={rx} fill="none" stroke={glass.stroke} strokeWidth="1.2" />
        {hasDirect && <Rect x={x + 6} y={y + 4} width={w - 12} height={h - 8} rx={Math.max(2, rx - 5)} fill="none" stroke="white" strokeWidth="2.5" opacity={0.45} />}
        <Line x1={x + w*0.2} y1={y + h*0.15} x2={x + w*0.55} y2={y + h*0.7} stroke="white" strokeWidth="5" opacity={0.09} strokeLinecap="round" />
      </Svg>
    )
  }

  if (shape === 'arc') {
    const arcR = w / 2
    const mirrorPath = `M ${x},${y + arcR} A ${arcR},${arcR} 0 0 1 ${x + w},${y + arcR} L ${x + w},${y + h} L ${x},${y + h} Z`
    const glowPath = `M ${x-4},${y + arcR} A ${arcR+4},${arcR+4} 0 0 1 ${x + w+4},${y + arcR} L ${x + w+4},${y + h+4} L ${x-4},${y + h+4} Z`
    const innerPath = `M ${x+5},${y + arcR} A ${arcR-5},${arcR-5} 0 0 1 ${x + w-5},${y + arcR} L ${x + w-5},${y + h-5} L ${x+5},${y + h-5} Z`
    return (
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {hasIndirect && <Path d={glowPath} fill="none" stroke={GLOW} strokeWidth={GLOW_W} opacity={0.7} />}
        <Path d={mirrorPath} fill={glass.fill} fillOpacity={glass.fillOpacity} />
        <Path d={mirrorPath} fill="none" stroke={glass.stroke} strokeWidth="1.2" />
        {hasDirect && <Path d={innerPath} fill="none" stroke="white" strokeWidth="2.5" opacity={0.45} />}
        <Line x1={x + w*0.25} y1={y + arcR*0.25} x2={x + w*0.5} y2={y + h*0.6} stroke="white" strokeWidth="5" opacity={0.09} strokeLinecap="round" />
      </Svg>
    )
  }

  if (shape === 'rounded-rect') {
    const rx = Math.round(Math.min(w, h) * 0.18)
    return (
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {hasIndirect && <Rect x={x-4} y={y-4} width={w+8} height={h+8} rx={rx+4} fill="none" stroke={GLOW} strokeWidth={GLOW_W} opacity={0.7} />}
        <Rect x={x} y={y} width={w} height={h} rx={rx} fill={glass.fill} fillOpacity={glass.fillOpacity} />
        <Rect x={x} y={y} width={w} height={h} rx={rx} fill="none" stroke={glass.stroke} strokeWidth="1.2" />
        {hasDirect && <Rect x={x+5} y={y+4} width={w-10} height={h-8} rx={Math.max(2, rx-4)} fill="none" stroke="white" strokeWidth="2.5" opacity={0.45} />}
        <Line x1={x+w*0.25} y1={y+h*0.1} x2={x+w*0.52} y2={y+h*0.58} stroke="white" strokeWidth="5" opacity={0.09} strokeLinecap="round" />
      </Svg>
    )
  }

  // rechthoek + overige
  const rx = shape === 'organic' ? 0 : 2
  const organicPath = shape === 'organic'
    ? `M ${x+w*0.45} ${y} C ${x+w*0.9} ${y} ${x+w} ${y+h*0.2} ${x+w*0.97} ${y+h*0.55} C ${x+w*0.94} ${y+h*0.9} ${x+w*0.55} ${y+h} ${x+w*0.18} ${y+h*0.97} C ${x-w*0.05} ${y+h*0.93} ${x} ${y+h*0.65} ${x+w*0.03} ${y+h*0.28} C ${x+w*0.06} ${y} ${x+w*0.22} ${y} ${x+w*0.45} ${y} Z`
    : null

  return (
    <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      {hasIndirect && (organicPath
        ? <Path d={organicPath} fill="none" stroke={GLOW} strokeWidth={GLOW_W} opacity={0.7} />
        : <Rect x={x-4} y={y-4} width={w+8} height={h+8} rx={rx} fill="none" stroke={GLOW} strokeWidth={GLOW_W} opacity={0.7} />
      )}
      {organicPath
        ? <><Path d={organicPath} fill={glass.fill} fillOpacity={glass.fillOpacity} /><Path d={organicPath} fill="none" stroke={glass.stroke} strokeWidth="1.2" /></>
        : <><Rect x={x} y={y} width={w} height={h} rx={rx} fill={glass.fill} fillOpacity={glass.fillOpacity} /><Rect x={x} y={y} width={w} height={h} rx={rx} fill="none" stroke={glass.stroke} strokeWidth="1.2" /></>
      }
      {hasDirect && !organicPath && <Rect x={x+5} y={y+4} width={w-10} height={h-8} rx={1} fill="none" stroke="white" strokeWidth="2.5" opacity={0.45} />}
      <Line x1={x+w*0.25} y1={y+h*0.1} x2={x+w*0.52} y2={y+h*0.58} stroke="white" strokeWidth="5" opacity={0.09} strokeLinecap="round" />
    </Svg>
  )
}

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

        {/* Spiegel preview */}
        <View style={[styles.section, { alignItems: 'center' }]}>
          <PdfMirrorPreview opts={opts} width={config.width} height={config.height} />
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
              <Text style={styles.pricingLabel}>Prijs per stuk (excl. btw)</Text>
              <Text style={styles.pricingValue}>{formatPrice(consumerUnit)}</Text>
            </View>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Aantal</Text>
              <Text style={styles.pricingValue}>{quantity}×</Text>
            </View>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Subtotaal excl. btw</Text>
              <Text style={styles.pricingValue}>{formatPrice(consumerTotal)}</Text>
            </View>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>BTW 21%</Text>
              <Text style={styles.pricingValue}>{formatPrice(Math.round(consumerTotal * 0.21))}</Text>
            </View>
            <View style={styles.pricingDivider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Totaal incl. btw</Text>
              <Text style={styles.totalValue}>{formatPrice(Math.round(consumerTotal * 1.21))}</Text>
            </View>
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
              Deze offerte is 30 dagen geldig. Prijzen zijn excl. btw, tenzij anders vermeld. Het totaalbedrag is inclusief 21% btw.
              Onder voorbehoud van beschikbaarheid. Productietijd is 4 tot 6 weken na akkoord. Neem contact op voor vragen of bestelling.
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
            <View>
              <Text style={styles.companyName}>{dealer.company ?? dealer.name ?? 'Uw leverancier'}</Text>
              <Text style={styles.companyDetails}>{dealer.email}</Text>
            </View>
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
