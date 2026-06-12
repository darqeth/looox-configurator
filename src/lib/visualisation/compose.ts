import sharp from 'sharp'
import { readFile } from 'fs/promises'
import path from 'path'
import type { Scene } from './scenes'

// Compositing-engine: plaatst de geconfigureerde spiegel deterministisch in
// een badkamerscène (epic badkamer-visualisatie, fase 1).
// Principes (vault-besluit): het product wordt NOOIT door AI getekend; de
// reflectie komt uit de scène zelf (gespiegeld + vervaagd) — 0% artefacten.

export type VisualisationInput = {
  shape: 'rechthoek' | 'rounded-rect' | 'rond' | 'organic' | 'ovaal' | 'arc'
  /** cm */
  width: number
  /** cm — bij rond gelijk aan width (diameter) */
  height: number
  glasKleur: 'helder' | 'smoke-zwart' | 'smoke-brons'
  /** posities met directe LED: boven/onder/boven-beneden/links-rechts/rondom */
  directPositions: string[]
  /** posities met indirecte LED: boven-beneden/onder/links-rechts/rondom */
  indirectPositions: string[]
  /** 3000 = warm, 4000 = koel */
  lichtKelvin: 3000 | 4000
  /** Frame-in-kleur subkeuze, of null voor randloos */
  frameColor?: 'aluminium' | 'zwart' | 'gun-metal' | 'brushed-brass' | 'brushed-copper' | null
  /** Tip-Touch bediening: klein lichtgevend cirkeltje onderin het glas */
  tipTouch?: boolean
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

// Organic-contour: de echte productvorm, aangeleverd door Mark
// (organic_vorm.svg, Marketing NAS). Vervangen = ORGANIC_PATH +
// ORGANIC_BBOX aanpassen (bbox meten: pad renderen en trimmen).
const ORGANIC_PATH = 'M73.5,134c-1.1,0-2.3,0-3.4-.2-.4,0-.8,0-1.3-.2-.8-.1-1.7-.3-2.5-.5h0c-4.1-.9-8.2-2.7-12.1-5.4-20.7-14.2-36.5-33.7-48.4-59.5C.8,57.1-1.1,45.2.6,34.7,2.5,22.6,8.9,12.9,19.1,6.8,28,1.4,45.4-.6,58.1.2c20.8.7,78.6,13,98.7,39.4,6.3,8.3,8.3,17.2,6,26.4v.4c-10.5,29.2-39.2,53.3-79,66-3.4,1.1-6.9,1.7-10.4,1.7Z'
const ORGANIC_BBOX = { x: 0, y: 0, w: 163.7, h: 134 }

// Pad geschaald naar doelmaat (px) met optionele offset, als SVG-groep
function organicGroup(w: number, h: number, offsetX: number, offsetY: number, inner: string): string {
  const sx = w / ORGANIC_BBOX.w
  const sy = h / ORGANIC_BBOX.h
  return `<g transform="translate(${offsetX - ORGANIC_BBOX.x * sx}, ${offsetY - ORGANIC_BBOX.y * sy}) scale(${sx}, ${sy})">${inner}</g>`
}

// Gemiddelde schaal: compenseert stroke-breedtes binnen de geschaalde groep
function organicStrokeScale(w: number, h: number): number {
  return (w / ORGANIC_BBOX.w + h / ORGANIC_BBOX.h) / 2
}

// Boogvorm (arc): vlakke onderkant, halfronde top. Offset o > 0 geeft de
// binnencontour (zandstraalbaan), o < 0 de buitencontour (gloed).
function arcPath(w: number, h: number, o = 0): string {
  const r = w / 2
  return `M ${o},${r} A ${r - o},${r - o} 0 0 1 ${w - o},${r} L ${w - o},${h - o} L ${o},${h - o} Z`
}

// Hoekradius: vaste productmaat — LoooX afgeronde hoeken = R60 (6 cm),
// onafhankelijk van het spiegelformaat. Rechthoek = scherp (0).
const ROUNDED_RECT_RADIUS_CM = 6
function rxFor(shape: VisualisationInput['shape'], pxPerCm: number): number {
  return shape === 'rounded-rect' ? Math.round(ROUNDED_RECT_RADIUS_CM * pxPerCm) : 0
}

const GLASS_TINT: Record<string, { color: string; opacity: number }> = {
  helder: { color: '#aebfc7', opacity: 0.10 },
  'smoke-zwart': { color: '#14161a', opacity: 0.30 },
  'smoke-brons': { color: '#4a3422', opacity: 0.25 },
}

// Rookglas dooft en kleurt wat er IN de spiegel te zien is — een overlay
// alleen is op lichte scènes onzichtbaar (feedback Mark): de reflectie
// zelf moet donkerder en getint
const GLASS_REFLECTION: Record<string, { brightness: number; saturation: number; tint?: { r: number; g: number; b: number } }> = {
  helder: { brightness: 1, saturation: 1 },
  'smoke-zwart': { brightness: 0.74, saturation: 0.85 },
  'smoke-brons': { brightness: 0.79, saturation: 0.9, tint: { r: 205, g: 168, b: 118 } },
}

function mirrorMaskSvg(w: number, h: number, shape: VisualisationInput['shape'], rx: number): string {
  const inner = shape === 'organic'
    ? organicGroup(w, h, 0, 0, `<path d="${ORGANIC_PATH}" fill="#fff"/>`)
    : shape === 'arc'
    ? `<path d="${arcPath(w, h)}" fill="#fff"/>`
    : shape === 'rond'
    ? `<circle cx="${w / 2}" cy="${h / 2}" r="${w / 2}" fill="#fff"/>`
    : `<rect x="0" y="0" width="${w}" height="${h}" rx="${rx}" fill="#fff"/>`
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`
}

// Glasoverlay: tint + diagonale highlight + randje, plus directe LED-banen
function glassOverlaySvg(w: number, h: number, input: VisualisationInput, rx: number, framePx: number, stripPx: number, tipTouchPx: number): string {
  const { shape, glasKleur, directPositions } = input
  const tint = GLASS_TINT[glasKleur] ?? GLASS_TINT.helder
  const frame = input.frameColor ? FRAME_COLORS[input.frameColor] : null
  const clip = shape === 'organic'
    ? `<clipPath id="m">${organicGroup(w, h, 0, 0, `<path d="${ORGANIC_PATH}"/>`)}</clipPath>`
    : shape === 'arc'
    ? `<clipPath id="m"><path d="${arcPath(w, h)}"/></clipPath>`
    : shape === 'rond'
    ? `<clipPath id="m"><circle cx="${w / 2}" cy="${h / 2}" r="${w / 2}"/></clipPath>`
    : `<clipPath id="m"><rect x="0" y="0" width="${w}" height="${h}" rx="${rx}"/></clipPath>`

  // Directe LED: gesatineerde baan ~4.5% van de korte zijde, 6% inzet vanaf de rand
  const strip = stripPx // 18mm zandstraalbaan, vaste maat
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
  } else if (shape === 'ovaal') {
    if (pos.size > 0) {
      const ringRx = Math.max(2, Math.min(w, h) / 2 - inset)
      strips = `<rect x="${inset}" y="${inset}" width="${w - inset * 2}" height="${h - inset * 2}" rx="${ringRx}" fill="none" stroke="#ffffff" stroke-width="${strip * 1.6}" opacity="0.45" filter="url(#ledblur)"/>
        <rect x="${inset}" y="${inset}" width="${w - inset * 2}" height="${h - inset * 2}" rx="${ringRx}" fill="none" stroke="#ffffff" stroke-width="${strip}" opacity="0.97"/>`
    }
  } else if (shape === 'arc') {
    if (pos.size > 0) {
      strips = `<path d="${arcPath(w, h, inset)}" fill="none" stroke="#ffffff" stroke-width="${strip * 1.6}" opacity="0.45" filter="url(#ledblur)"/>
        <path d="${arcPath(w, h, inset)}" fill="none" stroke="#ffffff" stroke-width="${strip}" opacity="0.97"/>`
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

  const edge = shape === 'organic'
    ? organicGroup(w, h, 0, 0, `<path d="${ORGANIC_PATH}" fill="none" stroke="#000" stroke-opacity="0.28" stroke-width="${2 / organicStrokeScale(w, h)}"/>`)
    : shape === 'arc'
    ? `<path d="${arcPath(w, h, 1)}" fill="none" stroke="#000" stroke-opacity="0.28" stroke-width="2"/>`
    : shape === 'rond'
    ? `<circle cx="${w / 2}" cy="${h / 2}" r="${w / 2 - 1}" fill="none" stroke="#000" stroke-opacity="0.28" stroke-width="2"/>`
    : `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${rx}" fill="none" stroke="#000" stroke-opacity="0.28" stroke-width="2"/>`
  // (rx=0 bij rechthoek: scherpe hoeken)

  // Tip-Touch sensor: ringetje onder-midden, ~5cm boven de glasrand
  // Feller dan de rest: donker contrastrandje + dikkere witte ring met gloed,
  // zodat de sensor ook op lichte achtergronden zichtbaar is. Loopt er
  // onderlangs een zandstraalbaan, dan komt de ring erboven te zitten.
  const heeftOnderBaan = shape !== 'organic' &&
    (pos.has('onder') || pos.has('boven-beneden') || pos.has('rondom'))
  const tipTouchCy = heeftOnderBaan
    ? h - inset - strip - tipTouchPx * 2.4
    : h - tipTouchPx * 6
  const tipTouch = input.tipTouch && tipTouchPx > 0
    ? `<circle cx="${w / 2}" cy="${tipTouchCy}" r="${tipTouchPx}" fill="none" stroke="#000000" stroke-width="${Math.max(2, tipTouchPx * 0.55)}" opacity="0.25" filter="url(#ledblur)"/>
       <circle cx="${w / 2}" cy="${tipTouchCy}" r="${tipTouchPx}" fill="none" stroke="#ffffff" stroke-width="${Math.max(2, tipTouchPx * 0.4)}" opacity="0.7" filter="url(#ledblur)"/>
       <circle cx="${w / 2}" cy="${tipTouchCy}" r="${tipTouchPx}" fill="none" stroke="#ffffff" stroke-width="${Math.max(1.5, tipTouchPx * 0.3)}" opacity="1"/>`
    : ''

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
    ${tipTouch}
    ${frameLayer}
  </g>
  ${edge}
</svg>`
}

// Indirecte LED: gloeiende contour áchter de spiegel — tweelaags zodat hij
// ook op witte muren zichtbaar is: brede kleurrand + felle bijna-witte kern.
// Bij rechthoekige vormen alleen op de gekozen zijden (feedback Mark).
function haloSvg(w: number, h: number, pad: number, shape: VisualisationInput['shape'], color: { kern: string; rand: string }, positions: string[]): string {
  const W = w + pad * 2
  const H = h + pad * 2
  const strokeRand = Math.round(Math.min(w, h) * 0.20)
  const strokeKern = Math.round(strokeRand * 0.45)
  const pos = new Set(positions)

  let inner: string
  if (shape === 'organic') {
    inner = organicGroup(w, h, pad, pad, `<path d="${ORGANIC_PATH}" fill="none" stroke="${color.rand}" stroke-width="${strokeRand / organicStrokeScale(w, h)}"/>
       <path d="${ORGANIC_PATH}" fill="none" stroke="${color.kern}" stroke-width="${strokeKern / organicStrokeScale(w, h)}"/>`)
  } else if (shape === 'rond') {
    inner = `<circle cx="${W / 2}" cy="${H / 2}" r="${w / 2 + strokeRand * 0.2}" fill="none" stroke="${color.rand}" stroke-width="${strokeRand}"/>
       <circle cx="${W / 2}" cy="${H / 2}" r="${w / 2 + strokeKern * 0.2}" fill="none" stroke="${color.kern}" stroke-width="${strokeKern}"/>`
  } else if (shape === 'ovaal') {
    const haloRx = Math.min(w, h) / 2 + strokeRand * 0.2
    inner = `<rect x="${pad - strokeRand * 0.2}" y="${pad - strokeRand * 0.2}" width="${w + strokeRand * 0.4}" height="${h + strokeRand * 0.4}" rx="${haloRx}" fill="none" stroke="${color.rand}" stroke-width="${strokeRand}"/>
       <rect x="${pad - strokeKern * 0.2}" y="${pad - strokeKern * 0.2}" width="${w + strokeKern * 0.4}" height="${h + strokeKern * 0.4}" rx="${haloRx}" fill="none" stroke="${color.kern}" stroke-width="${strokeKern}"/>`
  } else if (shape === 'arc') {
    inner = `<g transform="translate(${pad}, ${pad})">
       <path d="${arcPath(w, h, -strokeRand * 0.2)}" fill="none" stroke="${color.rand}" stroke-width="${strokeRand}"/>
       <path d="${arcPath(w, h, -strokeKern * 0.2)}" fill="none" stroke="${color.kern}" stroke-width="${strokeKern}"/>
     </g>`
  } else if (pos.has('rondom')) {
    inner = `<rect x="${pad - strokeRand * 0.2}" y="${pad - strokeRand * 0.2}" width="${w + strokeRand * 0.4}" height="${h + strokeRand * 0.4}" rx="${Math.round(strokeRand * 0.4)}" fill="none" stroke="${color.rand}" stroke-width="${strokeRand}"/>
       <rect x="${pad - strokeKern * 0.2}" y="${pad - strokeKern * 0.2}" width="${w + strokeKern * 0.4}" height="${h + strokeKern * 0.4}" rx="${Math.round(strokeKern * 0.4)}" fill="none" stroke="${color.kern}" stroke-width="${strokeKern}"/>`
  } else {
    // Losse zijden: gloeiende band per gekozen kant. De banden lopen iets
    // voorbij de spiegelrand door: de blur vreet de uiteinden aan, zo dekt
    // de gloed na het vervagen alsnog de volledige zijde (feedback Mark)
    const over = strokeRand * 0.5
    const zijden: Array<{ x: number; y: number; w: number; h: number }> = []
    if (pos.has('boven-beneden')) {
      zijden.push({ x: pad - over, y: pad - strokeRand * 0.5, w: w + over * 2, h: strokeRand })
      zijden.push({ x: pad - over, y: pad + h - strokeRand * 0.5, w: w + over * 2, h: strokeRand })
    }
    if (pos.has('onder')) zijden.push({ x: pad - over, y: pad + h - strokeRand * 0.5, w: w + over * 2, h: strokeRand })
    if (pos.has('boven')) zijden.push({ x: pad - over, y: pad - strokeRand * 0.5, w: w + over * 2, h: strokeRand })
    if (pos.has('links-rechts')) {
      zijden.push({ x: pad - strokeRand * 0.5, y: pad - over, w: strokeRand, h: h + over * 2 })
      zijden.push({ x: pad + w - strokeRand * 0.5, y: pad - over, w: strokeRand, h: h + over * 2 })
    }
    inner = zijden.map(z => {
      const kx = z.x + (z.w > z.h ? 0 : (z.w - strokeKern) / 2)
      const ky = z.y + (z.w > z.h ? (z.h - strokeKern) / 2 : 0)
      const kw = z.w > z.h ? z.w : strokeKern
      const kh = z.w > z.h ? strokeKern : z.h
      return `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="${strokeRand * 0.25}" fill="${color.rand}"/>
        <rect x="${kx}" y="${ky}" width="${kw}" height="${kh}" rx="${strokeKern * 0.25}" fill="${color.kern}"/>`
    }).join('')
  }
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`
}

function shadowSvg(w: number, h: number, pad: number, shape: VisualisationInput['shape']): string {
  const W = w + pad * 2
  const H = h + pad * 2
  const inner = shape === 'organic'
    ? organicGroup(w, h, pad, pad, `<path d="${ORGANIC_PATH}" fill="#000"/>`)
    : shape === 'arc'
    ? `<g transform="translate(${pad}, ${pad})"><path d="${arcPath(w, h)}" fill="#000"/></g>`
    : shape === 'rond'
    ? `<circle cx="${W / 2}" cy="${H / 2}" r="${w / 2}" fill="#000"/>`
    : `<rect x="${pad}" y="${pad}" width="${w}" height="${h}" rx="${shape === 'ovaal' ? Math.min(w, h) / 2 : 0}" fill="#000"/>`
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`
}

// Resultaat met losse spiegellaag: de AI-pas (fase 2) bewerkt het hele beeld
// en daarna plakken we de spiegel pixel-exact terug (product nooit uit AI)
export type ComposedVisualisation = {
  jpeg: Buffer
  /** Spiegellaag + positie in de coördinaten van het eindbeeld (1800x1200) */
  mirror: { layer: Buffer; x: number; y: number; w: number; h: number }
  width: number
  height: number
}

export async function composeVisualisation(scene: Scene, input: VisualisationInput, publicDir?: string): Promise<Buffer> {
  return (await composeVisualisationWithLayers(scene, input, publicDir)).jpeg
}

export async function composeVisualisationWithLayers(scene: Scene, input: VisualisationInput, assetsDir?: string): Promise<ComposedVisualisation> {
  // Buiten public/: Vercel stript public-bestanden uit serverless-bundels
  // (CDN-assets), ook met outputFileTracingIncludes
  const base = assetsDir ?? path.join(process.cwd(), 'assets')
  const sceneBuf = await readFile(path.join(base, scene.image))

  // Spiegelmaat in scène-pixels
  const rxPx = input.shape === 'ovaal'
    ? Math.round(Math.min(input.width, input.height) * scene.pxPerCm / 2)
    : rxFor(input.shape, scene.pxPerCm)
  const framePx = input.frameColor ? Math.max(1, Math.round(0.52 * scene.pxPerCm)) : 0 // 2,6mm echt, 2x aangezet voor zichtbaarheid
  const stripPx = Math.max(2, Math.round(1.8 * scene.pxPerCm)) // zandstraalbaan 18mm
  const tipTouchPx = Math.max(3, Math.round(0.8 * scene.pxPerCm)) // sensor-ring ~16mm
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
  if (scene.reflectionWall) {
    // Kale muur tegenover de spiegel: egale tint met subtiel verticaal verloop
    const wallSvg = `<svg width="${scene.width}" height="${scene.height}" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.5"/>
        <stop offset="0.6" stop-color="${scene.reflectionWall}" stop-opacity="0"/>
        <stop offset="1" stop-color="#000000" stop-opacity="0.06"/>
      </linearGradient></defs>
      <rect width="${scene.width}" height="${scene.height}" fill="${scene.reflectionWall}"/>
      <rect width="${scene.width}" height="${scene.height}" fill="url(#w)"/>
    </svg>`
    reflectionSource = await sharp(Buffer.from(wallSvg)).jpeg().toBuffer()
    centerY = top + Math.round(hPx / 2)
  } else if (scene.reflectionImage) {
    reflectionSource = await sharp(await readFile(path.join(base, scene.reflectionImage)))
      .resize(scene.width, scene.height, { fit: 'cover' })
      .flop()
      .blur(5)
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
  const glasEffect = GLASS_REFLECTION[input.glasKleur] ?? GLASS_REFLECTION.helder
  let reflectionPipeline = sharp(reflectionSource)
    .extract({ left: cropLeft, top: cropTop, width: cropW, height: cropH })
    .resize(wPx, hPx)
    .modulate({ brightness: glasEffect.brightness, saturation: glasEffect.saturation })
  if (glasEffect.tint) reflectionPipeline = reflectionPipeline.tint(glasEffect.tint)
  const reflectionCrop = await reflectionPipeline.toBuffer()

  // Masker in spiegelvorm
  const mask = Buffer.from(mirrorMaskSvg(wPx, hPx, input.shape, rxPx))
  const reflection = await sharp(reflectionCrop)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer()

  // Glasoverlay (tint, highlight, LED-banen, rand)
  const overlay = Buffer.from(glassOverlaySvg(wPx, hPx, input, rxPx, framePx, stripPx, tipTouchPx))
  const mirrorLayer = await sharp(reflection)
    .composite([{ input: overlay }])
    .png()
    .toBuffer()

  const layers: sharp.OverlayOptions[] = []

  // Slagschaduw (multiply, offset van het licht af)
  const shadowPad = Math.round(Math.min(wPx, hPx) * 0.12)
  const shadowOffset = Math.round(shadowPad * 0.35) * (scene.lightFromX === -1 ? 1 : -1)
  // Indirecte LED wast de slagschaduw grotendeels weg (anders dooft de gloed)
  const heeftIndirect = input.indirectPositions.length > 0
  const shadow = await sharp(Buffer.from(shadowSvg(wPx, hPx, shadowPad, input.shape)))
    .blur(shadowPad / 2.2)
    .ensureAlpha(heeftIndirect ? 0.18 : 0.5)
    .png()
    .toBuffer()
  layers.push({
    input: shadow,
    left: left - shadowPad + shadowOffset,
    top: top - shadowPad + Math.round(shadowPad * 0.3),
    blend: 'multiply',
  })

  // Indirecte LED-gloed achter de spiegel
  if (heeftIndirect) {
    const haloPad = Math.round(Math.min(wPx, hPx) * 0.28)
    const halo = await sharp(Buffer.from(haloSvg(wPx, hPx, haloPad, input.shape, GLOW_COLOR[input.lichtKelvin], input.indirectPositions)))
      .blur(haloPad / 3.2)
      .png()
      .toBuffer()
    layers.push({ input: halo, left: left - haloPad, top: top - haloPad, blend: 'screen' })
  }

  // De spiegel zelf
  layers.push({ input: mirrorLayer, left, top })

  // Let op: sharp past resize vóór composite toe als je ze in één keten zet —
  // eerst composen op volle resolutie, daarna apart uitsnijden en verkleinen
  const composed = await sharp(sceneBuf).composite(layers).png().toBuffer()

  // Vaste 3:2-uitsnede rond de spiegel: zo hebben het fase 1-beeld en de
  // AI-output (1536x1024) dezelfde verhouding en blijft re-compose exact
  const OUT_W = 1800
  const OUT_H = 1200
  let outCropW = scene.width
  let outCropH = Math.round(scene.width / 1.5)
  if (outCropH > scene.height) {
    outCropH = scene.height
    outCropW = Math.round(scene.height * 1.5)
  }
  const mirrorCx = left + wPx / 2
  const mirrorCy = top + hPx / 2
  // Verticaal: midden tussen spiegel en scènecentrum, zodat meubel én spiegel in beeld blijven
  const focusCy = (mirrorCy + scene.height / 2) / 2
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)
  const outCropX = clamp(Math.round(mirrorCx - outCropW / 2), 0, scene.width - outCropW)
  const outCropY = clamp(Math.round(focusCy - outCropH / 2), 0, scene.height - outCropH)

  const jpeg = await sharp(composed)
    .extract({ left: outCropX, top: outCropY, width: outCropW, height: outCropH })
    .resize(OUT_W, OUT_H)
    .jpeg({ quality: 88 })
    .toBuffer()

  // Spiegellaag omrekenen naar eindbeeld-coördinaten voor de re-compose
  const scale = OUT_W / outCropW
  const outMirror = {
    layer: await sharp(mirrorLayer).resize(Math.max(1, Math.round(wPx * scale)), Math.max(1, Math.round(hPx * scale))).png().toBuffer(),
    x: Math.round((left - outCropX) * scale),
    y: Math.round((top - outCropY) * scale),
    w: Math.max(1, Math.round(wPx * scale)),
    h: Math.max(1, Math.round(hPx * scale)),
  }

  return { jpeg, mirror: outMirror, width: OUT_W, height: OUT_H }
}
