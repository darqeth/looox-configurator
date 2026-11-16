// Dubbele bedrijven samenvoegen: zelfde naam, alleen anders geschreven (hoofdletters,
// spaties, rechtsvorm). Vestigingen met een andere plaatsnaam blijven apart.
//
//   node tools/bedrijven-samenvoegen.mjs              proefdraai: toont wat er zou gebeuren
//   node tools/bedrijven-samenvoegen.mjs --voer-uit   voert het uit (eerst akkoord van Mark)
//   --sla-over="looox,lamo"                            groepen overslaan (genormaliseerde naam)
//
// Per groep blijft het bedrijf met de meeste leden over (bij gelijk het oudste). Leden,
// uitnodigingen en profielen van de andere gaan daarheen; de lege bedrijven verdwijnen.
// Instellingen van het bedrijf (factor, toegang) blijven die van het bedrijf dat overblijft.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = readFileSync('.env.local', 'utf8');
const get = (k) => env.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1]?.trim();
const admin = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
const uitvoeren = process.argv.includes('--voer-uit');
const slaOver = (process.argv.find((a) => a.startsWith('--sla-over='))?.split('=')[1] ?? '').split(',').filter(Boolean);

// Gelijk aan normaliseerBedrijf in src/lib/bedrijfsnaam.ts
const norm = (naam) => naam.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' en ')
  .replace(/(^|\s)(b\.?\s?v\.?|v\.?\s?o\.?\s?f\.?|n\.?\s?v\.?)(?=\s|$)/g, ' ').replace(/[^a-z0-9]/g, '');
const ok = (r, wat) => { if (r.error) { console.error('FOUT', wat, r.error.message); process.exit(1); } return r.data; };

const bedrijven = ok(await admin.from('companies').select('*').order('created_at'), 'companies');
const leden = ok(await admin.from('company_members').select('id, company_id, user_id, role'), 'leden');
const uitnodigingen = ok(await admin.from('company_invites').select('id, company_id, email, accepted_at'), 'uitnodigingen');
const profielen = ok(await admin.from('profiles').select('id, company_id, company'), 'profielen');

const groepen = {};
for (const b of bedrijven) (groepen[norm(b.name)] ??= []).push(b);
const instellingen = (b) => Object.entries(b).filter(([k]) => !['id', 'name', 'created_at'].includes(k)).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(' ');
let samengevoegd = 0;
for (const [sleutel, groep] of Object.entries(groepen)) {
  if (groep.length < 2 || !sleutel) continue;
  if (slaOver.includes(sleutel)) { console.log(`\n[${sleutel}] overgeslagen`); continue; }
  const aantal = (id) => leden.filter((l) => l.company_id === id).length;
  const [blijft, ...weg] = [...groep].sort((a, b) => aantal(b.id) - aantal(a.id));
  console.log(`\n[${sleutel}] blijft: "${blijft.name}" (${aantal(blijft.id)} leden) | ${instellingen(blijft)}`);
  for (const b of weg) {
    const anders = instellingen(b) !== instellingen(blijft);
    console.log(`   weg: "${b.name}" (${aantal(b.id)} leden, ${uitnodigingen.filter((u) => u.company_id === b.id).length} uitnodigingen, ${profielen.filter((p) => p.company_id === b.id).length} profielen)${anders ? ' | LET OP andere instellingen: ' + instellingen(b) : ''}`);
    if (!uitvoeren) continue;
    for (const l of leden.filter((l) => l.company_id === b.id)) {
      const alLid = leden.some((x) => x.company_id === blijft.id && x.user_id === l.user_id);
      if (alLid) ok(await admin.from('company_members').delete().eq('id', l.id), 'dubbel lid weg');
      else { ok(await admin.from('company_members').update({ company_id: blijft.id }).eq('id', l.id), 'lid verhuizen'); l.company_id = blijft.id; }
    }
    for (const u of uitnodigingen.filter((u) => u.company_id === b.id)) {
      const bestaat = uitnodigingen.some((x) => x.company_id === blijft.id && x.email === u.email);
      if (bestaat) ok(await admin.from('company_invites').delete().eq('id', u.id), 'dubbele uitnodiging weg');
      else { ok(await admin.from('company_invites').update({ company_id: blijft.id }).eq('id', u.id), 'uitnodiging verhuizen'); u.company_id = blijft.id; }
    }
    ok(await admin.from('profiles').update({ company_id: blijft.id, company: blijft.name.trim() }).eq('company_id', b.id), 'profielen verhuizen');
    // Controle: er mag niets meer aan het oude bedrijf hangen, anders niet verwijderen
    const rest = ok(await admin.from('company_members').select('id').eq('company_id', b.id), 'controle');
    if (rest.length) { console.error('   NIET verwijderd, er hangen nog leden aan'); process.exit(1); }
    ok(await admin.from('companies').delete().eq('id', b.id), 'bedrijf weg');
    samengevoegd++;
  }
  if (uitvoeren && blijft.name !== blijft.name.trim()) ok(await admin.from('companies').update({ name: blijft.name.trim() }).eq('id', blijft.id), 'naam opschonen');
}
// Profielen zonder gekoppeld bedrijf waarvan de naam al als bedrijf bestaat: alleen melden
const los = profielen.filter((p) => !p.company_id && p.company && groepen[norm(p.company)]);
console.log(`\nProfielen zonder koppeling met een bestaande bedrijfsnaam: ${los.length} (worden bij hun volgende login vanzelf gekoppeld)`);
console.log(uitvoeren ? `\nKlaar: ${samengevoegd} bedrijven samengevoegd.` : '\nProefdraai: er is niets gewijzigd.');
