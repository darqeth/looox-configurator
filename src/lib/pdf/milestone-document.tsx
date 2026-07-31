import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { PdfLogo } from './pdf-logo'

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
            <PdfLogo height={29} />
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
