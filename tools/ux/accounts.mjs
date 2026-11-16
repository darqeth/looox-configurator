// Testaccounts voor het gebruikersonderzoek: aanmaken ("maak") of alles weer weghalen ("weg").
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { randomBytes } from 'crypto';
const env = readFileSync('.env.local', 'utf8');
const get = (k) => env.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1]?.trim();
const admin = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
const NAMEN = ['bram', 'debby', 'nico', 'demian', 'rosie'];
const BESTAND = '.tmp/ux/accounts.json';
const cap = (s) => s[0].toUpperCase() + s.slice(1);

if (process.argv[2] === 'maak') {
  const bekend = existsSync(BESTAND) ? JSON.parse(readFileSync(BESTAND, 'utf8')) : {};
  const sjabloon = (await admin.from('profiles').select('tier, korting, configurator_access, price_multiplier, price_factor, price_factor_enabled').eq('email', 'test-claude@rmsanitair.com').single()).data;
  const lidSjabloon = (await admin.from('company_members').select('can_order, can_see_purchase_prices, can_configure, own_configs_only').limit(1).eq('role', 'manager').single()).data;
  for (const n of NAMEN) {
    const email = `test-ux-${n}@rmsanitair.com`;
    const password = bekend[n]?.password ?? 'Ux-' + randomBytes(9).toString('base64url');
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
    let user = list.users.find((u) => u.email === email);
    if (!user) {
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `TEST UX ${cap(n)}` } });
      if (error) { console.error(n, error.message); continue; }
      user = data.user;
    } else await admin.auth.admin.updateUserById(user.id, { password });
    let { data: bedrijf } = await admin.from('companies').select('id').eq('name', `TEST UX Badkamers ${cap(n)}`).maybeSingle();
    if (!bedrijf) bedrijf = (await admin.from('companies').insert({ name: `TEST UX Badkamers ${cap(n)}` }).select('id').single()).data;
    const { error: pErr } = await admin.from('profiles').upsert({
      id: user.id, email, full_name: `${cap(n)} (TEST UX)`, company: `TEST UX Badkamers ${cap(n)}`, company_id: bedrijf.id,
      approval_status: 'approved', meubel_access: true, is_international: false, ...sjabloon,
    }, { onConflict: 'id' });
    const { data: lid } = await admin.from('company_members').select('id').eq('user_id', user.id).maybeSingle();
    const { error: mErr } = lid ? { error: null } : await admin.from('company_members').insert({ company_id: bedrijf.id, user_id: user.id, role: 'manager', ...lidSjabloon });
    bekend[n] = { email, password, userId: user.id, companyId: bedrijf.id };
    console.log(n, 'klaar', pErr?.message ?? '', mErr?.message ?? '');
  }
  writeFileSync(BESTAND, JSON.stringify(bekend, null, 1));
} else if (process.argv[2] === 'toon') {
  const bekend = JSON.parse(readFileSync(BESTAND, 'utf8'));
  for (const [n, a] of Object.entries(bekend)) {
    const cfg = await admin.from('configurations').select('id, name, status', { count: 'exact' }).eq('user_id', a.userId);
    console.log(n, a.email, 'configuraties:', cfg.count, (cfg.data ?? []).map((c) => `${c.name} [${c.status}]`).join('; '));
  }
} else console.log('gebruik: maak | toon');
