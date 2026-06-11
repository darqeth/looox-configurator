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
  /** posities met directe LED (zandstraalbaan): boven/onder/links/rechts/rondom */
  directPositions: string[]
  /** indirecte LED achter de spiegel */
  indirect: boolean
  /** 3000 = warm, 4000 = koel */
  lichtKelvin: 3000 | 4000
}

const GLOW_COLOR: Record<number, string> = {
  3000: '#FFD9A6',
  4000: '#EAF1FF',
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
function glassOverlaySvg(w: number, h: number, input: VisualisationInput, rx: number): string {
  const { shape, glasKleur, directPositions } = input
  const tint = GLASS_TINT[glasKleur] ?? GLASS_TINT.helder
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
    if (pos.has('boven') || pos.has('boven-onder') || pos.has('rondom'))
      stripRects.push({ x: inset, y: inset, w: horW, h: strip })
    if (pos.has('onder') || pos.has('boven-onder') || pos.has('rondom'))
      stripRects.push({ x: inset, y: h - inset - strip, w: horW, h: strip })
    if (pos.has('links') || pos.has('links-rechts') || pos.has('rondom'))
      stripRects.push({ x: inset, y: inset, w: strip, h: verH })
    if (pos.has('rechts') || pos.has('links-rechts') || pos.has('rondom'))
      stripRects.push({ x: w - inset - strip, y: inset, w: strip, h: verH })
    for (const r of stripRects) {
      strips += `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${strip / 2}" fill="#ffffff" opacity="0.45" filter="url(#ledblur)"/>
        <rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="${strip / 2}" fill="#ffffff" opacity="0.97"/>`
    }
  }

  const edge = shape === 'rond'
    ? `<circle cx="${w / 2}" cy="${h / 2}" r="${w / 2 - 1}" fill="none" stroke="#000" stroke-opacity="0.28" stroke-width="2"/>
       <circle cx="${w / 2}" cy="${h / 2}" r="${w / 2 - 3}" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="1"/>`
    : `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${rx}" fill="none" stroke="#000" stroke-opacity="0.28" stroke-width="2"/>
       <rect x="3" y="3" width="${w - 6}" height="${h - 6}" rx="${Math.max(rx - 2, 0)}" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="1"/>`
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
  </defs>
  <g clip-path="url(#m)">
    <rect width="${w}" height="${h}" fill="${tint.color}" opacity="${tint.opacity}"/>
    <rect width="${w}" height="${h}" fill="url(#hl)"/>
    ${strips}
  </g>
  ${edge}
</svg>`
}

// Indirecte LED: gloeiende ring/contour áchter de spiegel
function haloSvg(w: number, h: number, pad: number, shape: VisualisationInput['shape'], color: string): string {
  const W = w + pad * 2
  const H = h + pad * 2
  const stroke = Math.round(Math.min(w, h) * 0.10)
  const inner = shape === 'rond'
    ? `<circle cx="${W / 2}" cy="${H / 2}" r="${w / 2 + stroke * 0.25}" fill="none" stroke="${color}" stroke-width="${stroke}"/>`
    : `<rect x="${pad - stroke * 0.25}" y="${pad - stroke * 0.25}" width="${w + stroke * 0.5}" height="${h + stroke * 0.5}" rx="${Math.round(stroke * 0.4)}" fill="none" stroke="${color}" stroke-width="${stroke}"/>`
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
  const wPx = Math.round(input.width * scene.pxPerCm)
  const hPx = Math.round((input.shape === 'rond' ? input.width : input.height) * scene.pxPerCm)
  const left = Math.round(scene.centerX - wPx / 2)
  const top = Math.round(scene.mirrorBottomY - hPx)

  // ── Reflectie: de scène zelf, horizontaal gespiegeld, vervaagd en gedimd ──
  // (reflectieplaat-truc; bij echte LoooX-foto's kan hier de tegenfoto in)
  const reflectionSource = await sharp(sceneBuf)
    .flop()
    .blur(4)
    .modulate({ brightness: 0.88, saturation: 0.88 })
    .toBuffer()
  // Crop het gebied rond de spiegelpositie (licht verschoven voor parallax-gevoel)
  const parallax = Math.round(wPx * 0.06)
  const cropLeft = Math.min(Math.max(0, scene.width - left - wPx + parallax), scene.width - wPx)
  const cropTop = Math.min(Math.max(0, top - Math.round(hPx * 0.04)), scene.height - hPx)
  const reflectionCrop = await sharp(reflectionSource)
    .extract({ left: cropLeft, top: cropTop, width: wPx, height: hPx })
    .toBuffer()

  // Masker in spiegelvorm
  const mask = Buffer.from(mirrorMaskSvg(wPx, hPx, input.shape, rxPx))
  const reflection = await sharp(reflectionCrop)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer()

  // Glasoverlay (tint, highlight, LED-banen, rand)
  const overlay = Buffer.from(glassOverlaySvg(wPx, hPx, input, rxPx))
  const mirrorLayer = await sharp(reflection)
    .composite([{ input: overlay }])
    .png()
    .toBuffer()

  const layers: sharp.OverlayOptions[] = []

  // Slagschaduw (multiply, offset van het licht af)
  const shadowPad = Math.round(Math.min(wPx, hPx) * 0.12)
  const shadowOffset = Math.round(shadowPad * 0.35) * (scene.lightFromX === -1 ? 1 : -1)
  const shadow = await sharp(Buffer.from(shadowSvg(wPx, hPx, shadowPad, input.shape)))
    .blur(shadowPad / 2.2)
    .ensureAlpha(0.5)
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
    const haloPad = Math.round(Math.min(wPx, hPx) * 0.22)
    const halo = await sharp(Buffer.from(haloSvg(wPx, hPx, haloPad, input.shape, GLOW_COLOR[input.lichtKelvin])))
      .blur(haloPad / 2.5)
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
