# Designchecker / Webactueel Evidence Stack

Generieke read-only uitvoer- en bewijslaag voor Webactueel-specialisten. De vakskills blijven inhoudelijk eigenaar en de geregistreerde Google Drive-bronnen blijven projectwaarheid.

## Standaardroute

`vraag -> webactueel-workflow -> domain owner -> live Drive-bron -> bewijsbehoefte -> Designchecker -> GitHub Actions -> run-scoped artifact -> owning Skill`

Designchecker is uitsluitend een execution/evidence capability. Hij wordt nooit een tweede vakowner en bepaalt geen zelfstandig Go/No-Go.

## Repository hygiene

De default branch bevat alleen generieke capability, contracten, validators, fixtures en regressietests.

- Concrete `requests/command.json`-state bestaat alleen tijdelijk op een `runtime/**`-branch.
- Request-inputs voor een concrete opdracht blijven op die tijdelijke branch of in run-artifacts.
- `results/` is runtime-output, staat in `.gitignore` en wordt uitsluitend als GitHub Actions-artifact gepubliceerd.
- Screenshots, dated runs, targetdata en project-/run-specifieke evidence worden niet naar `main` gecommit.

## Engines

- Playwright voor browsercapture en DOM/runtime-inspectie.
- axe-core voor automatische accessibility-risicosignalen.
- Lighthouse voor labmetingen.
- Pixelmatch + Sharp voor screenshotregressie.
- Nu HTML Checker voor markupvalidatie.
- Native fetch/Python/Node voor begrensde technische inspectie.

## Lokale ontwikkeling

```bash
npm install
npm run setup:browsers
npm run build
npm test
npm run smoke
```

Lokale installatie is alleen voor ontwikkeling; remote evidence draait via GitHub Actions.

## Bewijsgrenzen

Automatische tools leveren signalen en reproduceerbare evidence, geen garantie. axe-core bewijst geen volledige WCAG-conformiteit; Lighthouse is labdata; visual diff beoordeelt geen wenselijkheid; runtime-GO/No-Go blijft bij `website-qa-checklist`.
