import React from 'react'
import { Image } from '@react-pdf/renderer'
import { PDF_LOGO_PNG } from './logo-data'

// Gedeeld PDF-logo (PNG uit assets/pdf-logo.png). Alleen de hoogte wordt
// vastgezet — de breedte schaalt mee op de beeldverhouding. Zo wordt het logo
// nooit hoger dan het oude, wat anders elementen naar een volgende pagina duwt.
// Standaard 35pt = hoogte van het oude LooxBathroomsLogo op width 110.
export function PdfLogo({ height = 35 }: { height?: number }) {
  // react-pdf's <Image> kent geen alt-prop; de jsx-a11y-regel is hier een false positive.
  // eslint-disable-next-line jsx-a11y/alt-text
  return <Image src={PDF_LOGO_PNG} style={{ height }} />
}
