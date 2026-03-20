-- Changelogs seed — run eenmalig in Supabase SQL Editor
-- Format title: "vX.Y.Z — Naam van de update"

TRUNCATE changelogs;

INSERT INTO changelogs (title, body, published_at) VALUES
(
  'v0.1.80 — Iconen, kleurkeuzes en formuliervalidatie',
  'De configurator toont nu herkenbare icoontjes bij verlichting en extra opties. Framekleur, klokpositie en make-up spiegelpositie zijn verplichte keuzes die inline in de kaart verschijnen. De ''Volgende''-knop blijft geblokkeerd totdat alle verplichte velden ingevuld zijn.',
  '2026-03-20 18:00:00+01'
),
(
  'v0.1.79 — Bedieningsopties met prijzen',
  'De bediening voor verlichting (tip-touch, dimmer, schakelaar, motion sensor, afstandsbediening) toont nu de prijs per optie. RGBW-verlichting vereist altijd afstandsbediening — dit wordt nu duidelijk weergegeven.',
  '2026-03-20 16:00:00+01'
),
(
  'v0.1.78 — Artikelnummers',
  'Elke configuratie krijgt nu automatisch een uniek artikelnummer (LX-[jaar]-[code]). Dit nummer is zichtbaar in het overzicht, op het dashboard en in het beheerdersdeel. Je kunt er ook op zoeken in het adminpaneel.',
  '2026-03-20 14:00:00+01'
),
(
  'v0.1.77 — Verbeterde spiegelweergave',
  'De lichtvisualisatie in de configurator is verbeterd. Directe verlichting toont nu een gezandstraalde baan in het spiegelglas, indirecte verlichting toont een warme gloed op de muur achter de spiegel. Bij de optie ''rondom'' verschijnt de gloed als een vloeiende rand zonder hoekgaten.',
  '2026-03-19 22:00:00+01'
),
(
  'v0.1.76 — Account, LoooX Circle & overzichtspagina''s',
  'Je kunt nu je profielgegevens en wachtwoord bijwerken via Mijn account, inclusief het uploaden van een bedrijfslogo. De LoooX Circle pagina toont je voortgang, behaalde mijlpalen en de voordelen per niveau. Ook zijn de pagina''s voor Configuraties en Bestellingen toegevoegd.',
  '2026-03-19 20:00:00+01'
),
(
  'v0.1.75 — Live omgeving',
  'De applicatie is nu live bereikbaar via je eigen URL. Je kunt inloggen, configuraties aanmaken en het dashboard bekijken.',
  '2026-03-19 18:00:00+01'
),
(
  'v0.1.74 — Spiegelconfigurator',
  'Je kunt nu spiegels configureren in 4 stappen: kies een vorm, stel de afmetingen in, voeg verlichting toe en selecteer extras. De prijs wordt direct bijgewerkt terwijl je kiest.',
  '2026-03-19 16:00:00+01'
),
(
  'v0.1.73 — Mobiele verbeteringen',
  'Het LoooX-logo is nu zichtbaar op mobiel. De zoekfunctie werkt beter op kleine schermen en sluit nu ook met een kruisje.',
  '2026-03-19 14:00:00+01'
),
(
  'v0.1.72 — Zoeken en notificaties',
  'Er is een zoekknop toegevoegd aan het dashboard. Klik erop om snel door je configuraties en bestellingen te zoeken.',
  '2026-03-18 16:00:00+01'
),
(
  'v0.1.71 — Nieuwsfeed met afbeeldingen',
  'De nieuwsberichten in het dashboard tonen nu ook afbeeldingen. De meest recente berichten staan bovenaan.',
  '2026-03-18 14:00:00+01'
),
(
  'v0.1.70 — Gebruikersbeheer',
  'Beheerders kunnen nieuwe gebruikers nu goedkeuren of afwijzen vanuit het adminpaneel. Openstaande aanvragen zijn zichtbaar als getal in het menu.',
  '2026-03-18 10:00:00+01'
),
(
  'v0.1.69 — Eerste versie',
  'Het dashboard is live met inloggen, registreren en een overzichtspagina. Beheerders zien een apart adminmenu.',
  '2026-03-17 12:00:00+01'
);
