import sharp from 'sharp'
import { readFile } from 'fs/promises'
import path from 'path'
import type { Scene } from './scenes'

// Compositing-engine: plaatst de geconfigureerde spiegel deterministisch in
// een badkamerscène (epic badkamer-visualisatie, fase 1).
// Principes (vault-besluit): het product wordt NOOIT door AI getekend; de
// reflectie komt uit de scène zelf (gespiegeld + vervaagd) — 0% artefacten.

export type VisualisationInput = {
  shape: 'rechthoek' | 'rounded-rect' | 'rond'
  /** cm */
  width: number
  /** cm — bij rond gelijk aan width (diameter) */
  height: number
  glasKleur: 'helder' | 'smoke-zwart' | 'smoke-brons'
  /** posities met directe LED: boven/onder/boven-beneden/links-rechts/rondom */
  directPositions: string[]
  /** indirecte LED achter de spiegel */
  indirect: boolean
  /** 3000 = warm, 4000 = koel */
  lichtKelvin: 3000 | 4000
  /** Frame-in-kleur subkeuze, of null voor randloos */
  frameColor?: 'aluminium' | 'zwart' | 'gun-metal' | 'brushed-brass' | 'brushed-copper' | null
}

// Metallic frame: donkere basis + lichte highlight voor een geborsteld effect
const FRAME_COLORS: Record<string, { dark: string; light: string }> = {
  'aluminium':      { dark: '#9DA2A6', light: '#E6E8EA' },
  'zwart':          { dark: '#232325', light: '#48484A' },
  'gun-metal':      { dark: '#3C4046', light: '#646A72' },
  'brushed-brass':  { dark: '#9A7C45', light: '#D8BC82' },
  'brushed-copper': { dark: '#8F5A3C', light: '#C98E68' },
}

const GLOW_COLOR: Record<number, { kern: string; rand: string }> = {
  3000: { kern: '#FFF3DC', rand: '#FFC97A' },
  4000: { kern: '#F6FAFF', rand: '#C9DCFF' },
}

// Hoekradius: vaste productmaat — LoooX afgeronde hoeken = R60 (6 cm),
// onafhankelijk van het spiegelformaat. Rechthoek = scherp (0).
const ROUNDED_RECT_RADIUS_CM = 6
function rxFor(shape: VisualisationInput['shape'], pxPerCm: number): number {
  return shape === 'rounded-rect' ? Math.round(ROUNDED_RECT_RADIUS_CM * pxPerCm) : 0
}

const GLASS_TINT: Record<string, { color: string; opacity: number }> = {
  helder: { color: '#aebfc7', opacity: 0.10 },
  'smoke-zwart': { color: '#14161a', opacity: 0.42 },
  'smoke-brons': { color: '#4a3422', opacity: 0.38 },
}

function mirrorMaskSvg(w: number, h: number, shape: VisualisationInput['shape'], rx: number): string {
  const inner = shape === 'rond'
    ? `<circle cx="${w / 2}" cy="${h / 2}" r="${w / 2}" fill="#fff"/>`
    : `<rect x="0" y="0" width="${w}" height="${h}" rx="${rx}" fill="#fff"/>`
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`
}

// Glasoverlay: tint + diagonale highlight + randje, plus directe LED-banen
function glassOverlaySvg(w: number, h: number, input: VisualisationInput, rx: number, framePx: number): string {
  const { shape, glasKleur, directPositions } = input
  const tint = GLASS_TINT[glasKleur] ?? GLASS_TINT.helder
  const frame = input.frameColor ? FRAME_COLORS[input.frameColor] : null
  const clip = shape === 'rond'
    ? `<clipPath id="m"><circle cx="${w / 2}" cy="${h / 2}" r="${w / 2}"/></clipPath>`
    : `<clipPath id="m"><rect x="0" y="0" width="${w}" height="${h}" rx="${rx}"/></clipPath>`

  // Directe LED: gesatineerde baan ~4.5% van de korte zijde, 6% inzet vanaf de rand
  const strip = Math.round(Math.min(w, h) * 0.045)
  const inset = Math.round(Math.min(w, h) * 0.06)
  // Scherpe LED-banen: zachte gloed-onderlaag + solide witte kern erbovenop
  // (verlichting moet crisp zijn — feedback sprint 1-check)
  let strips = ''
  const pos = new Set(directPositions)
  const stripRects: Array<{ x: number; y: number; w: number; h: number }> = []
  if (shape === 'rond') {
    if (pos.size > 0) {
      strips = `<circle cx="${w / 2}" cy="${h / 2}" r="${w / 2 - inset}" fill="none" stroke="#ffffff" stroke-width="${strip * 1.6}" opacity="0.45" filter="url(#ledblur)"/>
        <circle cx="${w / 2}" cy="${h / 2}" r="${w / 2 - inset}" fill="none" stroke="#ffffff" stroke-width="${strip}" opacity="0.97"/>`
    }
  } else {
    const horW = w - inset * 2
    const verH = h - inset * 2
    if (pos.has('boven') || pos.has('boven-beneden') || pos.has('rondom'))
      stripRects.push({ x: inset, y: inset, w: horW, h: strip })
    if (pos.has('onder') || pos.has('boven-beneden') || pos.has('rondom'))
      stripRects.push({ x: inset, y: h - inset - strip, w: horW, h: strip })
    if (pos.has('links') || pos.has('links-rechts') || pos.has('rondom'))
      stripRects.push({ x: inset, y: inset, w: strip, h: verH })
    if (pos.has('rechts') || pos.has('links-rechts') || pos.has('rondom'))
      stripRects.push({ x: w - inset - strip, y: inset, w: strip, h: verH })
    for (const r of stripRects) {
      // Echte zandstraalbanen zijn strak rechthoekig (geen afgeronde uiteinden)
      strips += `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="#ffffff" opacity="0.45" filter="url(#ledblur)"/>
        <rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="#ffffff" opacity="0.97"/>`
    }
  }

  // Frame: dikke metallic rand langs de binnenkant van de spiegelvorm
  // (stroke ligt half over de rand, clip houdt 'm netjes binnen de vorm)
  let frameLayer = ''
  if (frame && framePx > 0) {
    const fw = framePx * 2 // stroke-helft binnen telt als framePx
    frameLayer = shape === 'rond'
      ? `<circle cx="${w / 2}" cy="${h / 2}" r="${w / 2}" fill="none" stroke="url(#framegrad)" stroke-width="${fw}"/>`
      : `<rect x="0" y="0" width="${w}" height="${h}" rx="${rx}" fill="none" stroke="url(#framegrad)" stroke-width="${fw}"/>`
  }

  const edge = shape === 'rond'
    ? `<circle cx="${w / 2}" cy="${h / 2}" r="${w / 2 - 1}" fill="none" stroke="#000" stroke-opacity="0.28" stroke-width="2"/>`
    : `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${rx}" fill="none" stroke="#000" stroke-opacity="0.28" stroke-width="2"/>`
  // (rx=0 bij rechthoek: scherpe hoeken)

  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${clip}
    <filter id="ledblur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${Math.max(3, strip / 3)}"/></filter>
    <linearGradient id="hl" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.16"/>
      <stop offset="0.45" stop-color="#ffffff" stop-opacity="0.03"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.10"/>
    </linearGradient>
    ${frame ? `<linearGradient id="framegrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${frame.light}"/>
      <stop offset="0.5" stop-color="${frame.dark}"/>
      <stop offset="1" stop-color="${frame.light}"/>
    </linearGradient>` : ''}
  </defs>
  <g clip-path="url(#m)">
    <rect width="${w}" height="${h}" fill="${tint.color}" opacity="${tint.opacity}"/>
    <rect width="${w}" height="${h}" fill="url(#hl)"/>
    ${strips}
    ${frameLayer}
  </g>
  ${edge}
</svg>`
}

// Indirecte LED: gloeiende contour áchter de spiegel — tweelaags zodat hij
// ook op witte muren zichtbaar is: brede kleurrand + felle bijna-witte kern
function haloSvg(w: number, h: number, pad: number, shape: VisualisationInput['shape'], color: { kern: string; rand: string }): string {
  const W = w + pad * 2
  const H = h + pad * 2
  const strokeRand = Math.round(Math.min(w, h) * 0.20)
  const strokeKern = Math.round(strokeRand * 0.45)
  const inner = shape === 'rond'
    ? `<circle cx="${W / 2}" cy="${H / 2}" r="${w / 2 + strokeRand * 0.2}" fill="none" stroke="${color.rand}" stroke-width="${strokeRand}"/>
       <circle cx="${W / 2}" cy="${H / 2}" r="${w / 2 + strokeKern * 0.2}" fill="none" stroke="${color.kern}" stroke-width="${strokeKern}"/>`
    : `<rect x="${pad - strokeRand * 0.2}" y="${pad - strokeRand * 0.2}" width="${w + strokeRand * 0.4}" height="${h + strokeRand * 0.4}" rx="${Math.round(strokeRand * 0.4)}" fill="none" stroke="${color.rand}" stroke-width="${strokeRand}"/>
       <rect x="${pad - strokeKern * 0.2}" y="${pad - strokeKern * 0.2}" width="${w + strokeKern * 0.4}" height="${h + strokeKern * 0.4}" rx="${Math.round(strokeKern * 0.4)}" fill="none" stroke="${color.kern}" stroke-width="${strokeKern}"/>`
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`
}

function shadowSvg(w: number, h: number, pad: number, shape: VisualisationInput['shape']): string {
  const W = w + pad * 2
  const H = h + pad * 2
  const inner = shape === 'rond'
    ? `<circle cx="${W / 2}" cy="${H / 2}" r="${w / 2}" fill="#000"/>`
    : `<rect x="${pad}" y="${pad}" width="${w}" height="${h}" fill="#000"/>`
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`
}

export async function composeVisualisation(scene: Scene, input: VisualisationInput, publicDir?: string): Promise<Buffer> {
  const base = publicDir ?? path.join(process.cwd(), 'public')
  const sceneBuf = await readFile(path.join(base, scene.image))

  // Spiegelmaat in scène-pixels
  const rxPx = rxFor(input.shape, scene.pxPerCm)
  const framePx = input.frameColor ? Math.max(1, Math.round(0.26 * scene.pxPerCm)) : 0 // 2,6mm zichtbare rand
  const wPx = Math.round(input.width * scene.pxPerCm)
  const hPx = Math.round((input.shape === 'rond' ? input.width : input.height) * scene.pxPerCm)
  const left = Math.round(scene.centerX - wPx / 2)
  const top = Math.round(scene.mirrorBottomY - hPx)

  // ── Reflectie ──
  // Met tegenfoto (wat er tegenover de spiegel staat): echte reflectie —
  // gespiegeld, vrijwel scherp. Zonder: de scène zelf als benadering.
  // De spiegel toont de overkant VERKLEIND (langere optische weg): we croppen
  // een groter gebied en passen dat in de spiegelmaat (reflectionScale)
  const rScale = scene.reflectionImage ? (scene.reflectionScale ?? 0.55) : 0.85
  const cropW = Math.min(Math.round(wPx / rScale), scene.width)
  const cropH = Math.min(Math.round(hPx / rScale), scene.height)

  let reflectionSource: Buffer
  let centerY: number
  if (scene.reflectionImage) {
    reflectionSource = await sharp(await readFile(path.join(base, scene.reflectionImage)))
      .resize(scene.width, scene.height, { fit: 'cover' })
      .flop()
      .blur(1.5)
      .modulate({ brightness: 0.94, saturation: 0.95 })
      .toBuffer()
    centerY = Math.round((scene.reflectionFocusY ?? 0.5) * scene.height)
  } else {
    reflectionSource = await sharp(sceneBuf)
      .flop()
      .blur(4)
      .modulate({ brightness: 0.88, saturation: 0.88 })
      .toBuffer()
    centerY = top + Math.round(hPx / 2)
  }
  // Horizontale positie: gespiegelde x van de spiegelpositie (parallax-gevoel)
  const parallax = Math.round(wPx * 0.06)
  const centerX = scene.width - left - Math.round(wPx / 2) + parallax
  const cropLeft = Math.min(Math.max(0, centerX - Math.round(cropW / 2)), scene.width - cropW)
  const cropTop = Math.min(Math.max(0, centerY - Math.round(cropH / 2)), scene.height - cropH)
  const reflectionCrop = await sharp(reflectionSource)
    .extract({ left: cropLeft, top: cropTop, width: cropW, height: cropH })
    .resize(wPx, hPx)
    .toBuffer()

  // Masker in spiegelvorm
  const mask = Buffer.from(mirrorMaskSvg(wPx, hPx, input.shape, rxPx))
  const reflection = await sharp(reflectionCrop)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer()

  // Glasoverlay (tint, highlight, LED-banen, rand)
  const overlay = Buffer.from(glassOverlaySvg(wPx, hPx, input, rxPx, framePx))
  const mirrorLayer = await sharp(reflection)
    .composite([{ input: overlay }])
    .png()
    .toBuffer()

  const layers: sharp.OverlayOptions[] = []

  // Slagschaduw (multiply, offset van het licht af)
  const shadowPad = Math.round(Math.min(wPx, hPx) * 0.12)
  const shadowOffset = Math.round(shadowPad * 0.35) * (scene.lightFromX === -1 ? 1 : -1)
  // Indirecte LED wast de slagschaduw grotendeels weg (anders dooft de gloed)
  const shadow = await sharp(Buffer.from(shadowSvg(wPx, hPx, shadowPad, input.shape)))
    .blur(shadowPad / 2.2)
    .ensureAlpha(input.indirect ? 0.18 : 0.5)
    .png()
    .toBuffer()
  layers.push({
    input: shadow,
    left: left - shadowPad + shadowOffset,
    top: top - shadowPad + Math.round(shadowPad * 0.3),
    blend: 'multiply',
  })

  // Indirecte LED-gloed achter de spiegel
  if (input.indirect) {
    const haloPad = Math.round(Math.min(wPx, hPx) * 0.28)
    const halo = await sharp(Buffer.from(haloSvg(wPx, hPx, haloPad, input.shape, GLOW_COLOR[input.lichtKelvin])))
      .blur(haloPad / 3.2)
      .png()
      .toBuffer()
    layers.push({ input: halo, left: left - haloPad, top: top - haloPad, blend: 'screen' })
  }

  // De spiegel zelf
  layers.push({ input: mirrorLayer, left, top })

  // Let op: sharp past resize vóór composite toe als je ze in één keten zet —
  // eerst composen op volle resolutie, daarna apart verkleinen
  const composed = await sharp(sceneBuf).composite(layers).png().toBuffer()
  return sharp(composed)
    .resize({ width: 1800, withoutEnlargement: true })
    .jpeg({ quality: 88 })
    .toBuffer()
}
