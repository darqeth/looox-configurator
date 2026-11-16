// Bediening van de computer van een testpersoon: node tools/ux/pc.mjs <naam> <opdracht> [waarden]
const POORT = { bram: 9311, debby: 9312, nico: 9313, demian: 9314, rosie: 9315 };
const [naam, cmd, ...args] = process.argv.slice(2);
if (!POORT[naam] || !cmd) { console.log('gebruik: pc.mjs <naam> <opdracht> [waarden]'); process.exit(1); }
try {
  const r = await fetch(`http://127.0.0.1:${POORT[naam]}`, { method: 'POST', body: JSON.stringify({ cmd, args }) });
  console.log(await r.text());
} catch { console.log('De computer reageert niet. Meld dit en stop.'); }
