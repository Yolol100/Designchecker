# Designchecker / Webactueel Evidence Stack

> **Portfoliostatus:** Flagship · actieve evidence-tool · read-only websiteanalyse

## In één oogopslag

Designchecker levert reproduceerbare browser-, accessibility-, performance-, markup- en visual-regressionevidence. De owning vakskill blijft verantwoordelijk voor interpretatie en het uiteindelijke Go/No-Go-besluit.

| Onderdeel | Bewijs |
| --- | --- |
| Doelgroep | Webactueel design-, development- en QA-workflows |
| Stack | TypeScript, Playwright, axe-core, Lighthouse, Pixelmatch, Sharp en Nu HTML Checker |
| Kwaliteit | CI, contracttests, fixtures en begrensde smokechecks |
| Veiligheid | Read-only uitvoering en tijdelijke run-scoped input/output |
| Resultaat | GitHub Actions-artifacts die teruggaan naar de owning specialist |

## Snel starten

1. Installeer dependencies met `npm install`.
2. Installeer browsers met `npm run setup:browsers`.
3. Voer `npm run build && npm test && npm run smoke` uit.
4. Gebruik voor echte opdrachten de geregistreerde requestworkflow en beoordeel het artifact binnen de owning vakskill.

## Architectuur

```text
owning specialist → begrensd request → Designchecker engines
                                      ↓
                              run-scoped evidence
                                      ↓
                         owning specialist → besluit
```

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

## Projectstatus, roadmap en support

Designchecker is actief als generieke uitvoer- en bewijslaag. Nieuwe engines mogen geen tweede vakowner of automatische productiegoedkeuring introduceren. Meld reproduceerbare defecten via [GitHub Issues](https://github.com/Yolol100/Designchecker/issues) zonder klanttargets of run-evidence te publiceren.

## Licentie

Deze repository bevat momenteel geen open-sourcelicentie. Hergebruik, distributie of afgeleide werken zijn niet toegestaan zonder expliciete toestemming van de rechthebbende.
