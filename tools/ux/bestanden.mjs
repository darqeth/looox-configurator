import sharp from 'sharp';
const uit = process.argv[2];
const stijl = 'font-family="Comic Sans MS, Marker Felt, sans-serif" fill="#1d3557"';
const schets = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#fbfaf5"/>
<g stroke="#1d3557" stroke-width="4" fill="none" stroke-linecap="round">
<path d="M150 420 L1050 425 L1048 610 L152 606 Z"/><path d="M600 422 L599 608"/>
<path d="M300 420 q60 -70 150 -72 q90 2 150 72" /><path d="M700 422 q60 -70 150 -72 q90 2 150 72"/>
<path d="M450 330 v-50 h40"/><path d="M850 330 v-50 h40"/>
<path d="M150 660 h900"/><path d="M150 645 v30 M1050 645 v30"/>
<ellipse cx="600" cy="170" rx="140" ry="120"/></g>
<text x="560" y="705" font-size="34" ${stijl}>160 cm</text>
<text x="250" y="530" font-size="28" ${stijl}>lade</text><text x="760" y="530" font-size="28" ${stijl}>lade</text>
<text x="770" y="150" font-size="28" ${stijl}>spiegel rond 80</text>
<text x="150" y="770" font-size="28" ${stijl}>meubel eiken, 2 waskommen erop, kranen op het blad</text></svg>`;
const maat = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700"><rect width="1200" height="700" fill="#fff"/>
<g stroke="#111" stroke-width="3" fill="none"><rect x="100" y="150" width="1000" height="300"/>
<circle cx="350" cy="310" r="18"/><circle cx="850" cy="310" r="18"/><circle cx="350" cy="200" r="12"/><circle cx="850" cy="200" r="12"/>
<path d="M100 500 h1000 M100 485 v30 M1100 485 v30 M100 560 h250 M350 545 v30"/></g>
<g font-family="Arial" font-size="26" fill="#111"><text x="560" y="540">1600</text><text x="200" y="600">400</text><text x="870" y="320">Ø45 afvoer</text><text x="870" y="205">Ø35 kraan</text>
<text x="100" y="80" font-size="32">Maattekening blad, bovenaanzicht (maten in mm)</text><text x="520" y="140">achterkant (muur)</text></g></svg>`;
await sharp(Buffer.from(schets)).jpeg({ quality: 85 }).toFile(uit + '/schets-klant.jpg');
await sharp(Buffer.from(maat)).png().toFile(uit + '/maattekening.png');
console.log('bestanden ok');
