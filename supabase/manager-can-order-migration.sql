-- ─── can_order LEIDEND MAKEN, OOK VOOR MANAGERS ───────────────────────────────
-- Tot nu toe mocht een manager (i_am_manager()) altijd bestellen, ongeacht de
-- can_order-vlag. Daardoor kon een superadmin de eerste/enige persoon van een
-- bedrijf niet het bestellen ontzeggen. We halen de manager-bypass uit de
-- INSERT-policy op orders; de can_order-vlag is voortaan leidend.
--
-- Veilig: standaard is can_order = true en op productie heeft géén manager
-- can_order = false, dus geen enkele bestaande manager wordt geblokkeerd.
-- Solo-gebruikers zonder bedrijf (my_company_id() IS NULL) mogen gewoon bestellen.

DROP POLICY IF EXISTS "Gebruiker plaatst bestelling als can_order" ON orders;

CREATE POLICY "Gebruiker plaatst bestelling als can_order"
  ON orders FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      my_company_id() IS NULL
      OR EXISTS (
        SELECT 1 FROM company_members
        WHERE user_id = auth.uid()
          AND company_id = my_company_id()
          AND can_order = true
      )
    )
  );
