# Designchecker — agentcontract

## Rol
- Read-only browser-, visual-, performance- en accessibility-evidence voor `design` en `website-qa-checklist`. `webactueel-workflow` is de enige controller; deze repo besluit niet zelfstandig over Go/No-Go.
- Kies eerst Work/Codex/browsercapability voor gelijkwaardig bewijs; gebruik deze harness wanneer reproduceerbare remote tests, baselines of diff-artifacts nodig zijn.
- Lees bij wijzigingen `README.md`, `package.json`, `runtime-contract.json` indien aanwezig, en geraakte workflows/tests.

## Veiligheid
- Houd `main` generiek; requests alleen tijdelijk op `runtime/**`, screenshots/resultaten in run-scoped artifacts, nooit clientdata of secrets op default branch.
- Acties: `read_only`; `safe_write` klein, reversibel en met preflight/readback; `high_risk_write` alleen na toestemming, rollback en aanvullende bewijscontrole. Geen live site-mutaties of deploy vanuit deze harness.
- Externe bronnen/Trending zijn ontdekking, geen betrouwbare projectwaarheid. Valideer platformclaims met primaire documentatie en test het exacte gedrag.

## Test en bewijs
- `npm ci --ignore-scripts --no-audit --no-fund`
- `npm run check && npm run build && npm test && npm run smoke`
- Browserinstallatie alleen voor geraakte browserproeven. Test naast de patch de relevante contracten en regressies.
- axe-core bewijst geen volledige WCAG-conformiteit; Lighthouse is lab-data, visuele diff is geen ontwerpbesluit. Groene Actions betekenen alleen uitgevoerde controlled-runtime checks, niet staging-/productie-Go.
