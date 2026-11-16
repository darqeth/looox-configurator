// Gebruikersonderzoek: testaccounts en alles wat eraan hangt verwijderen.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = readFileSync('.env.local', 'utf8');
const get = (k) => env.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1]?.trim();
const admin = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
const bekend = JSON.parse(readFileSync('.tmp/ux/accounts.json', 'utf8'));
const stap = async (label, p) => { const r = await p; if (r.error) console.log('  FOUT', label, r.error.message); return r; };
for (const [n, a] of Object.entries(bekend)) {
  const prof = await admin.from('profiles').select('email, full_name').eq('id', a.userId).maybeSingle();
  if (!prof.data?.email?.startsWith('test-ux-') ) { console.log(n, 'OVERGESLAGEN, geen test-ux profiel:', prof.data?.email); continue; }
  const bedrijf = await admin.from('companies').select('name').eq('id', a.companyId).maybeSingle();
  if (!bedrijf.data?.name?.startsWith('TEST UX ')) { console.log(n, 'OVERGESLAGEN, bedrijf is geen TEST UX:', bedrijf.data?.name); continue; }
  const leden = await admin.from('company_members').select('user_id').eq('company_id', a.companyId);
  if ((leden.data ?? []).some((l) => l.user_id !== a.userId)) { console.log(n, 'OVERGESLAGEN, bedrijf heeft andere leden'); continue; }
  const cfg = (await admin.from('configurations').select('id').eq('user_id', a.userId)).data ?? [];
  const ord = (await admin.from('orders').select('id').eq('user_id', a.userId)).data ?? [];
  let bestanden = 0;
  for (const b of ['attachments', 'drawings', 'visualisations', 'avatars']) {
    for (const pre of [a.userId, a.companyId, ...cfg.map((c) => c.id), ...ord.map((o) => o.id)]) {
      const l = await admin.storage.from(b).list(pre, { limit: 200 });
      if (l.data?.length) { await stap(`opslag ${b}`, admin.storage.from(b).remove(l.data.map((f) => `${pre}/${f.name}`))); bestanden += l.data.length; }
    }
  }
  if (ord.length) await stap('order_drawings', admin.from('order_drawings').delete().in('order_id', ord.map((o) => o.id)));
  await stap('orders', admin.from('orders').delete().eq('user_id', a.userId));
  await stap('visualisations', admin.from('visualisations').delete().eq('user_id', a.userId));
  await stap('configurations', admin.from('configurations').delete().eq('user_id', a.userId));
  await stap('user_milestones', admin.from('user_milestones').delete().eq('user_id', a.userId));
  await stap('login_streaks', admin.from('login_streaks').delete().eq('user_id', a.userId));
  await stap('company_invites', admin.from('company_invites').delete().eq('company_id', a.companyId));
  await stap('company_members', admin.from('company_members').delete().eq('company_id', a.companyId));
  await stap('profiles', admin.from('profiles').delete().eq('id', a.userId));
  await stap('companies', admin.from('companies').delete().eq('id', a.companyId));
  await stap('auth', admin.auth.admin.deleteUser(a.userId));
  console.log(n, `weg: ${ord.length} orderregels, ${cfg.length} configuraties, ${bestanden} bestanden`);
}
// controle
const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
console.log('rest auth:', list.users.filter((u) => u.email?.startsWith('test-ux-')).length,
  '| profielen:', (await admin.from('profiles').select('id', { count: 'exact', head: true }).like('email', 'test-ux-%')).count,
  '| bedrijven:', (await admin.from('companies').select('id', { count: 'exact', head: true }).like('name', 'TEST UX %')).count,
  '| orders:', (await admin.from('orders').select('id', { count: 'exact', head: true }).in('user_id', Object.values(bekend).map((a) => a.userId))).count,
  '| configuraties:', (await admin.from('configurations').select('id', { count: 'exact', head: true }).in('user_id', Object.values(bekend).map((a) => a.userId))).count);
