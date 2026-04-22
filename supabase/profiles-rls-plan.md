# Profiles RLS — Plan voor implementatie

## Status
Profiles heeft momenteel **geen RLS**. Alle andere tabellen wel (zie `rls-fix-migration.sql`).

## Waarom RLS uitstaat op profiles

Bij het inschakelen van profiles RLS viel de hele app uit. Oorzaak:

Alle bestaande policies op andere tabellen (configurations, orders, milestones, etc.) doen admin-checks via een directe subquery op profiles:

```sql
EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
```

Zodra profiles zelf RLS heeft, moeten die subqueries óók door de profiles-policy. Dat levert recursie of blokkering op — en omdat de admin-check dan faalt, verschijnt er niets meer in de UI.

## De oplossing

Vervang **alle** directe profiles-subqueries voor admin-checks door de al aangemaakte `is_looox_admin()` SECURITY DEFINER functie. Die functie bypast RLS intern, waardoor er geen recursie ontstaat.

### Stap 1 — Functie staat al klaar

Uit `rls-fix-migration.sql` (al uitgevoerd):

```sql
CREATE OR REPLACE FUNCTION is_looox_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;
```

### Stap 2 — Policies updaten

Elke `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)` vervangen door `is_looox_admin()`.

**Betrokken policies (per tabel):**

| Tabel | Policy naam |
|---|---|
| configurations | Gebruiker ziet eigen en toegestane configuraties |
| configurations | Gebruiker bewerkt eigen of collega configuraties |
| configurations | Gebruiker verwijdert eigen of manager verwijdert collega configs |
| orders | Gebruiker ziet eigen en toegestane bestellingen |
| orders | Admin mag bestellingen updaten *(gebruikt al is_looox_admin)* |
| companies | LoooX admin ziet alle bedrijven |
| company_members | Alleen manager beheert members |
| company_invites | LoooX admin ziet alle invites |
| milestones | Alleen admins mogen milestones beheren |
| user_milestones | Systeem mag user_milestones aanmaken |
| user_milestones | Gebruiker mag eigen user_milestone updaten |
| discount_codes | Alleen admins mogen kortingscodes aanmaken |
| discount_codes | Systeem mag kortingscode als gebruikt markeren |
| discount_code_uses | Alleen admins verwijderen gebruik |
| notifications | Alleen admins mogen notifications schrijven |
| changelogs | Alleen admins beheren changelogs *(gebruikt al is_looox_admin)* |
| products | Alleen admins beheren producten *(gebruikt al is_looox_admin)* |
| product_shapes | Alleen admins beheren product shapes *(gebruikt al is_looox_admin)* |
| option_groups | Alleen admins beheren option groups *(gebruikt al is_looox_admin)* |
| options | Alleen admins beheren options *(gebruikt al is_looox_admin)* |

### Stap 3 — Profiles RLS inschakelen

Na het updaten van alle policies:

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

Met deze policies:

```sql
CREATE POLICY "Gebruiker ziet eigen profiel en collega's"
  ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR is_looox_admin()
    OR (
      company_id IS NOT NULL
      AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Gebruiker bewerkt eigen profiel"
  ON profiles FOR UPDATE
  USING (id = auth.uid() OR is_looox_admin());

CREATE POLICY "Systeem en admin mogen profielen aanmaken"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid() OR is_looox_admin());

CREATE POLICY "Alleen admins verwijderen profielen"
  ON profiles FOR DELETE
  USING (is_looox_admin());
```

## Migratievolgorde

1. `DROP POLICY` + `CREATE POLICY` voor elke policy in de tabel hierboven
2. `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY`
3. Test met een admin-account → beheer menu zichtbaar?
4. Test met een dealer-account → configuraties/bestellingen zichtbaar?
5. Test het aanmaken van een configuratie als dealer

## Risico's

- **`my_company_id()` en `i_am_manager()`** zijn al SECURITY DEFINER → veilig
- **Profiles INSERT bij registratie**: de invite-flow maakt een profiel aan. Die flow gebruikt de service role (`createAdminClient`) → bypast RLS, geen probleem
- **Admin pages**: gebruiken `createAdminClient()` (service role) → bypast RLS altijd
- **`(SELECT company_id FROM profiles WHERE id = auth.uid())`** in de profiles SELECT policy: geen recursie, want die subquery vindt alleen de eigen rij via `id = auth.uid()` (base case)
