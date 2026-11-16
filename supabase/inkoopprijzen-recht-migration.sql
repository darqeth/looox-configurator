-- Recht "Ziet inkoopprijzen" per collega (kolom can_see_purchase_prices bestond al, maar werd niet gebruikt).
-- Tot nu toe zag iedere collega zijn inkoop bij bestellen. Zet het recht daarom voor alle bestaande
-- collega's AAN, zodat er niets verandert tot een manager het bewust uitzet.
-- Nieuwe uitnodigingen: de manager kiest het zelf (standaard uit, behalve bij "Volledig").
-- Eén keer draaien, vóór configurator 2.0 live gaat. Veilig om opnieuw te draaien? Nee: een tweede keer
-- zet het ook de collega's weer aan die een manager intussen heeft uitgezet.

UPDATE company_members SET can_see_purchase_prices = true WHERE can_see_purchase_prices = false;
UPDATE company_invites SET can_see_purchase_prices = true WHERE accepted_at IS NULL AND can_order = true AND can_see_purchase_prices = false;
