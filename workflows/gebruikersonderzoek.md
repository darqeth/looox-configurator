# Gebruikersonderzoek met AI-persona's

Vijf losse agents gebruiken de configurator als echte gebruiker, blind (geen kennis van de bouw), en schrijven hun gedachten ongenuanceerd uit. Eerste ronde: 16 november 2026, rapport in de vault onder `research/gebruikersonderzoek-2026-11-16/`.

## Stappen

1. Vraag Mark akkoord: testbestellingen sturen echte mails naar interne LoooX-adressen en krijgen een echt ordernummer.
2. `node tools/ux/accounts.mjs maak` maakt per persona een account `test-ux-<naam>@rmsanitair.com` met bedrijf "TEST UX Badkamers <Naam>" (manager, Tailor-Made aan). Gegevens komen in `.tmp/ux/accounts.json`, nooit tonen.
3. `node tools/ux/bestanden.mjs` maakt de voorbeeldbestanden (schets van klant, maattekening).
4. Per persona een browser starten in de achtergrond: `node tools/ux/daemon.mjs <naam> <poort> <uitmap>`. Poorten: bram 9311, debby 9312, nico 9313, demian 9314, rosie 9315. Debby draait op telefoonformaat.
5. `tools/ux/instructie.md` naar de uitmap kopiëren en `<UITMAP>` vervangen door het echte pad.
6. Per persona een agent starten (general-purpose, parallel, achtergrond) met: verwijzing naar de instructie, de persona, wat de persoon weet, en de klus. Geen bouwcontext meegeven.
7. Verslagen bundelen tot een rapport in de vault. Bugs die testers melden eerst in de code nalopen voor we ze als feit noteren.
8. Na akkoord van Mark: browsers stoppen (`lsof -ti tcp:<poort> | xargs kill -9`), `node tools/ux/opruimen.mjs overzicht` (alleen lezen), dan `node tools/ux/weg.mjs` (verwijdert orders, configuraties, bestanden, bedrijven en accounts, met controle op TEST UX).

## Spelregels voor de testers

- Bestellen alleen met TEST vooraan in de project- of configuratienaam, maximaal twee per persoon.
- Geen bericht naar LoooX, geen collega's uitnodigen, geen wachtwoord of e-mail wijzigen.
- Alleen het commando en schermfoto's gebruiken, geen code of mappen lezen.

## Uitleg van de accountmanager (alle persona's behalve Rosie)

"We hebben een nieuwe online configurator. Daar stel je zelf spiegels op maat samen en ook onze Tailor-Made meubels. Je ziet meteen de prijs, je kunt een offerte voor je klant maken en direct bij ons bestellen. Je zet alles per klant in een project. Hier is je login."

Per persoon één toevoeging: Debby "het werkt ook op je telefoon", Nico "je kunt je eigen marge instellen en je medewerkers kunnen er ook in", Demian "er zit ook een slim hulpje in".

Rosie gaat blind: alleen de URL en "Hier kun je spiegels en meubels bestellen".

## Persona's (van Mark)

### Bram
Man van 60+. Heeft als installateur zelf badkamers geplaatst en is overgegaan naar badkamers verkopen. Werkt al 20 jaar op dezelfde manier, tekent badkamers met Saninet. Vindt AI maar niets, kan niet goed tegen verandering en vindt het allemaal wel prima zo. Spot vogels en liket nepnieuws op Facebook.
Invulling: vaktechnisch sterk, weinig geduld met computers, leest geen lange teksten, moppert.
Klus: familie Van Dijk. Meubel op maat 140 cm met twee waskommen, houtkleur, lades, gaten voor afvoer en kraan precies doorgeven. Spiegel 140x70 met verlichting. Inkoop en klantprijs weten, offerte-PDF, bestellen als hij het vertrouwt.

### Debby
Vrouw van 55, haar hele leven verkoopster. Vindt het heerlijk om mensen te dienen, blij te maken en te ontlasten. Veel op haar iPhone met Candy Crush, facetimet met de kleinkinderen. Doet haar best om bij de tijd te blijven, draagt moderne kleding. Wil niet meer aan cursussen beginnen, is bijna klaar met werken.
Invulling: werkt op de telefoon, tikt op wat het meest opvalt, laat techniek aan de monteur, denkt vanuit de klant.
Klus: mevrouw De Boer staat naast haar. Ronde spiegel 80 cm met verlichting en iets tegen beslaan. Prijs noemen zonder de inkoop te tonen. Iets meegeven voor haar man. Bijpassend kastje van 80 cm bekijken. Spiegel bestellen.

### Nico
39 jaar, eigenaar van een badkamerzaak. Denkt dat hij heel up-to-date is, maar vraagt vooral anderen om uitleg. Snapt het na één keer uitleg, ontdekt zelf weinig. Twee kinderen (6 en 3), vrouw met een goede baan. Wandelt met de hond en houdt het gezin draaiende.
Invulling: weinig tijd, let op marge en op wat personeel ziet, eerste reflex bij vastlopen is iemand bellen.
Klus: eerst prijzen, marge en personeel uitzoeken. Dan project "Verbouwing Bakker": meubel 120 cm met één waskom en bijpassende spiegel met verlichting. Offerte met verkoopprijzen beoordelen. Klant belt: meubel wordt 130 cm. Bestellen.

### Demian
30 jaar, opgegroeid met apps en smartphones. Wil efficiënt werken, houdt van nieuwe gadgets en technieken. Werkt nooit lang voor dezelfde baas en neemt daardoor veel ervaring mee, zoekt altijd nieuwe tools. YouTube, TikTok, borreltje in de stad, airhockey.
Invulling: leest geen uitleg, klikt alles, probeert sneltoetsen en de terugknop, vergelijkt met andere tools, zoekt grenzen op.
Klus: project "Loft Jansen" zo snel mogelijk: meubel 160 cm met twee waskommen en twee spiegels. Alles proberen wat slim lijkt, de schets van de klant gebruiken. Gaten zelf zetten en iets geks doen. Offerte, bestellen, rondkijken in de rest.

### Rosie
Net van school, na haar stage blijven plakken bij de badkamerwinkel. Pottenbakken, Tinder. Moeite om een gesprek te starten omdat ze onzeker is over haar ervaring. Als mensen haar ideeën zien, zijn ze superblij met haar als adviseur.
Invulling: gevoel voor vorm en kleur, handig met apps, weinig technische kennis, bang om iets fout te bestellen, twijfelt eerst aan zichzelf.
Klus: uitzoeken wat dit is. Showroomopstelling samenstellen: spiegel met bijzondere vorm en meubel in mooie kleur. Iets laten zien aan de baas. Durven bestellen en snappen wat ze bestelt.
