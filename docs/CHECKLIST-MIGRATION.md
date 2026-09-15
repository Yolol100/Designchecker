# Checklist → Designchecker migratie

Doel: één gedeelde browser-evidenceruntime zonder Website-QA-bewijs te verzwakken.

## Status

De evidence-parity is bewezen en door `website-qa-checklist` als `Source GO` geaccepteerd voor de gemigreerde compatibility/evidence-route. Live `Yolol100/Orchestrator` routeert adapter `checklist` naar `Yolol100/Designchecker` via `.github/workflows/run-website-qa.yml`.

`Yolol100/Checklist` is daarom niet meer de actieve controllerroute. De repository blijft tijdelijk rollback-only tijdens de gedocumenteerde regressieperiode en mag pas worden gearchiveerd wanneer de resterende archive-gates aantoonbaar groen zijn.

## Bewezen parity

1. **Raw evidence**
   - publieke target- en SSRF-guards;
   - GET/HEAD-only netwerkgedrag;
   - browser-, link-, accessibility-, performance- en markupresultaten;
   - privacyredactie en begrensde artifacts.
2. **Formele evidence**
   - Evidence Manifest- en Runtime Matrix-semantiek;
   - policy-evaluatie op raw evidence;
   - severity/status-, rollback-, monitoring- en releasebesluitvelden;
   - negatieve en adversarial contracttests via de frozen compatibility runtime.
3. **Correlatie**
   - immutable request-ID;
   - exact request-head-SHA ↔ Actions-run ↔ artifact;
   - stale-result blokkade;
   - run-scoped output zonder projectwaarheid op `main`.
4. **Website QA-acceptatie**
   - `website-qa-checklist` heeft op 2026-09-15 het immutable parity-artifact van PR #27 onafhankelijk gevalideerd;
   - huidige Evidence Manifest- en Runtime Matrix-validators geven `VALID`;
   - 3/3 verplichte controlled-runtime-items staan op `passed`, zonder findings of mutatie;
   - acceptatie geldt alleen als `Source GO` voor compatibility/evidence, niet als website- of release-`Go`.

Zie `docs/CHECKLIST-MIGRATION-EVIDENCE.md` voor de exacte head-SHA, workflowruns, artifact-ID/digest en owner-acceptatiegrens.

## Uitgevoerde cutover

1. Bestaande Checklist-fixtures en contracten zijn vastgelegd als bevroren parityset.
2. De formele finalizer en gemigreerde Website-QA-runner staan in Designchecker.
3. De frozen parityworkflow is succesvol uitgevoerd op exact PR #27-head.
4. De Designchecker request/result-route staat in de live Orchestrator-adapterregistry.
5. `website-qa-checklist` heeft de gemigreerde output onafhankelijk geaccepteerd binnen de controlled-runtime claimgrens.
6. De controllertransport-route is omgeschakeld naar Designchecker.

## Resterende archive-gates

1. Synchroniseer en valideer de centrale `webactueel-workflow` repository-/adapterregistry tegen de live Designchecker-route.
2. Houd `Yolol100/Checklist` gedurende de regressieperiode beschikbaar als rollbackroute.
3. Bevestig dat geen actieve controllercallsite terugvalt op Checklist behalve expliciete rollback.
4. Controleer na de regressieperiode opnieuw parity en rollbackbeschikbaarheid.
5. Markeer archive-readiness in de centrale portfoliotracker voordat Checklist wordt gearchiveerd.

## Stopvoorwaarden

Stop of draai de cutover terug bij manifest-/outputregressie, lossere netwerk/privacyguards, oncorreleerbare artifacts, gewijzigde severitysemantiek, ontbrekende rollbackroute of een Website-QA-regressie.

Een groene repositoryrun blijft evidence en geen zelfstandig Go/No-Go. Hogere handmatige, staging-, echte-device-, assistive-technology- en productie-evidencelagen blijven buiten deze migratieacceptatie.
