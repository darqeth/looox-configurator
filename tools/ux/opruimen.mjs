// Gebruikersonderzoek: overzicht van wat de testaccounts hebben aangemaakt ("overzicht"). Alleen lezen.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = readFileSync('.env.local', 'utf8');
const get = (k) => env.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1]?.trim();
const admin = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
const bekend = JSON.parse(readFileSync('.tmp/ux/accounts.json', 'utf8'));
const TABELLEN = ['orders', 'configurations', 'attachments', 'drawings', 'order_drawings', 'visualisations', 'notifications', 'user_milestones', 'login_streaks', 'downloads', 'discount_code_uses', 'company_invites', 'avatars'];
const kolommen = {};
for (const t of TABELLEN) {
  const { data, error } = await admin.from(t).select('*').limit(1);
  kolommen[t] = error ? `FOUT ${error.message}` : Object.keys(data[0] ?? {}).join(',');
}
if (process.argv[3] === 'kolommen') console.log(kolommen);
for (const [n, a] of Object.entries(bekend)) {
  const regels = [];
  for (const t of TABELLEN) {
    for (const k of ['user_id', 'company_id', 'invited_by']) {
      if (!String(kolommen[t]).split(',').includes(k)) continue;
      const { count } = await admin.from(t).select('*', { count: 'exact', head: true }).eq(k, k === 'company_id' ? a.companyId : a.userId);
      if (count) regels.push(`${t}.${k}=${count}`);
    }
  }
  const o = await admin.from('orders').select('*').eq('user_id', a.userId);
  const nrs = (o.data ?? []).map((r) => r.order_number ?? r.id).join(', ');
  console.log(n, '|', regels.join(' ') || 'niets', nrs ? `| orders: ${nrs}` : '');
}
