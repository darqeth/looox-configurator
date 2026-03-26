import React from 'react'
import { Document, Page, View, Text, Svg, Path, Polygon, StyleSheet } from '@react-pdf/renderer'

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: BRAND,
  },
  badge: {
    backgroundColor: BRAND_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: BRAND,
    letterSpacing: 0.5,
  },
  titleSection: {
    marginBottom: 28,
  },
  label: {
    fontSize: 8,
    color: GRAY,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  milestoneTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    marginBottom: 8,
  },
  benefitBox: {
    backgroundColor: BRAND_LIGHT,
    borderRadius: 6,
    padding: 16,
    marginBottom: 28,
  },
  benefitLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: BRAND,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  benefitText: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: BRAND,
    lineHeight: 1.5,
  },
  infoRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 8,
    color: GRAY,
    width: 110,
    fontFamily: 'Helvetica-Bold',
  },
  infoValue: {
    fontSize: 9,
    color: DARK,
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  footerText: {
    fontSize: 7.5,
    color: GRAY,
    flex: 1,
  },
})

export interface MilestoneDocumentProps {
  milestoneTitle: string
  benefitDescription: string
  dealerName: string | null
  company: string | null
  achievedAt: string
}

export default function MilestoneDocument({
  milestoneTitle,
  benefitDescription,
  dealerName,
  company,
  achievedAt,
}: MilestoneDocumentProps) {
  const formattedDate = new Date(achievedAt).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const dealerDisplay = [company, dealerName].filter(Boolean).join(' - ') || 'Onbekend'

  return (
    <Document title={`LoooX Circle - ${milestoneTitle}`} author="LoooX">
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <LoooXLogo width={70} color={BRAND} />
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>LOOOX CIRCLE VOORDEEL</Text>
            </View>
            <Text style={{ fontSize: 8, color: GRAY, marginTop: 6 }}>Behaald op {formattedDate}</Text>
          </View>
        </View>

        {/* Mijlpaal titel */}
        <View style={styles.titleSection}>
          <Text style={styles.label}>MIJLPAAL</Text>
          <Text style={styles.milestoneTitle}>{milestoneTitle}</Text>
        </View>

        {/* Voordeel */}
        <View style={styles.benefitBox}>
          <Text style={styles.benefitLabel}>VOORDEEL</Text>
          <Text style={styles.benefitText}>{benefitDescription}</Text>
        </View>

        {/* Dealergegevens */}
        <Text style={{ ...styles.label, marginBottom: 8 }}>DEALERGEGEVENS</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Dealer</Text>
          <Text style={styles.infoValue}>{dealerDisplay}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Datum behaald</Text>
          <Text style={styles.infoValue}>{formattedDate}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Stuur dit document naar LoooX om je voordeel te activeren.{'\n'}
            LoooX BV  |  www.looox.nl
          </Text>
          <Text style={{ fontSize: 7.5, color: GRAY }}>LoooX Circle</Text>
        </View>

      </Page>
    </Document>
  )
}
