// Maakt de webafbeelding van een meubelrender (assets-bron → public/images/meubels).
// Centreert op het meubel zelf, niet op meubel + schaduw, zodat het midden in het vak staat.
// Gebruik: node tools/meubel-afbeelding.mjs <bron.png> <naam>
import sharp from 'sharp'

const [bron, naam] = process.argv.slice(2)
if (!bron || !naam) { console.error('Gebruik: node tools/meubel-afbeelding.mjs <bron.png> <naam>'); process.exit(1) }

const W = 1000, H = 750, VUL_B = 0.74, VUL_H = 0.66, WERK = 1600
const basis = sharp(bron, { limitInputPixels: false }).resize({ width: WERK })
const { data, info } = await basis.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
// Omlijsting van het meubel: alleen vrijwel dekkende pixels (de schaduw is doorschijnend)
let x0 = info.width, y0 = info.height, x1 = 0, y1 = 0
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
  if (data[(y * info.width + x) * 4 + 3] > 230) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
}
const bw = x1 - x0, bh = y1 - y0
const schaal = Math.min((W * VUL_B) / bw, (H * VUL_H) / bh)
// Uitsnede in bronpixels die, geschaald, precies W × H is met het meubel in het midden
const uw = Math.round(W / schaal), uh = Math.round(H / schaal)
const links = Math.round((x0 + x1) / 2 - uw / 2), boven = Math.round((y0 + y1) / 2 - uh / 2)
const rand = Math.max(uw, uh)
await sharp(await basis.clone().extend({ top: rand, bottom: rand, left: rand, right: rand, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer())
  .extract({ left: links + rand, top: boven + rand, width: uw, height: uh })
  .resize(W, H)
  .webp({ quality: 82 })
  .toFile(`public/images/meubels/model-${naam}.webp`)
console.log(naam, 'meubel', bw, 'x', bh, '→', W, 'x', H)
