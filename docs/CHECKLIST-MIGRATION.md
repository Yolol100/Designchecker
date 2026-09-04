# Checklist → Designchecker migratie

Doel: één gedeelde browser-evidenceruntime zonder Website-QA-bewijs te verzwakken.

## Status

`Yolol100/Checklist` blijft actief als legacy runtime. Nieuwe generieke browser-/visual-capabilities worden in Designchecker gebouwd. De oude route mag pas verdwijnen wanneer alle onderstaande gates aantoonbaar groen zijn.

## Vereiste parity

1. **Raw evidence**
   - publieke target- en SSRF-guards;
   - GET/HEAD-only netwerkgedrag;
   - browser-, link-, accessibility-, performance- en markupresultaten;
   - privacyredactie en begrensde artifacts.
2. **Formele evidence**
   - dezelfde Evidence Manifest- en Runtime Matrix-semantiek;
   - policy-evaluatie op meerdere raw rondes;
   - severity/status-, rollback-, monitoring- en releasebesluitvalidatie;
   - negatieve en adversarial fixtures.
3. **Correlatie**
   - immutable request-ID;
   - exact request-head-SHA ↔ Actions-run ↔ result/artifact;
   - stale-result blokkade;
   - run-scoped output zonder projectwaarheid op `main`.
4. **Website QA-acceptatie**
   - `website-qa-checklist` accepteert de nieuwe output tegen dezelfde scenario's;
   - een groene repositoryrun blijft evidence en geen zelfstandig Go/No-Go;
   - hogere handmatige/runtime-lagen blijven expliciet buiten automatische dekking.

## Uitvoeringsvolgorde

1. Leg bestaande Checklist-fixtures en contracten vast als bevroren parityset.
2. Implementeer de ontbrekende formele finalizer in Designchecker zonder de browserengine te dupliceren.
3. Draai beide runtimes tegen dezelfde veilige fixtures en vergelijk semantische output.
4. Voeg de Designchecker request/result-route toe aan de centrale adapterregistry.
5. Laat `website-qa-checklist` een gecontroleerde read-only acceptatieronde uitvoeren.
6. Schakel de controllerroute pas om na PASS op alle gates.
7. Houd Checklist gedurende één regressieperiode als rollbackroute.
8. Archiveer pas daarna de oude repository en verwijder de adapter uit de actieve registry.

## Stopvoorwaarden

Stop de migratie bij ontbrekende manifestparity, lossere netwerk/privacyguards, oncorreleerbare artifacts, gewijzigde severitysemantiek, ontbrekende rollbackroute of een Website-QA-regressie.

`NO_CHANGE` is de juiste uitkomst zolang parity niet volledig bewezen is.
