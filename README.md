# Designchecker / Webactueel Evidence Stack

Centrale read-only uitvoer- en bewijslaag voor Webactueel-specialisten. De Skills blijven inhoudelijk eigenaar; de geregistreerde Google Drive-manifesten blijven projectwaarheid.

## Standaardroute in ChatGPT Web

Geen custom MCP, tunnel, API-key of extra leveranciersaccount nodig. De standaardroute gebruikt de al verbonden GitHub-app en Google Drive-bronnen:

`vraag -> webactueel-workflow -> domain owner -> live Drive-manifest -> taakrelevante bronselector -> bewijsbehoefte -> Designchecker -> GitHub Actions -> results/<request_id>.json -> owning Skill`

- `webactueel-workflow` blijft controller.
- Design, SEO, Elementor, Programmeren/WordPress, Leads en Website QA blijven hun eigen owner.
- `designchecker-direct` is alleen de uitvoercapability en wordt nooit een tweede vakowner.
- `config/project-source-bindings.json` bindt elke route aan het exacte geregistreerde Drive-manifest-ID.
- `config/direct-command-registry.json` legt per command vast wanneer het draait, wanneer niet, waarom, voor welke owner, welke bronselectors geldig zijn en welk bewijs het levert.
- `config/designchecker-integration-contract.json` legt de vaste beslisvolgorde vast: doel -> owner -> live manifest -> selector -> bewijsniveau -> command -> resultaat terug naar owner.
- `scripts/run-command.mjs` weigert verkeerde owner/project/manifest-koppelingen, niet-geverifieerde broncontext, broncontext ouder dan 24 uur en Designcommands zonder passende `source_context.selector_ids`.
- `.github/workflows/command.yml` draait automatisch na een wijziging van `requests/command.json` op `main` en commit evidence plus artifacts terug naar `results/`.

## Design-triggering

Designchecker wordt voor Design alleen automatisch gebruikt wanneer `design` al als owner is gekozen, Project Design live en integer is gelezen en runtimebewijs de ontwerpbeslissing, het risico of de acceptatie kan veranderen.

- `design`: rendered UX/UI-, hiërarchie-, component-, CTA-, formulier- of overflowinspectie.
- `a11y`: geautomatiseerde accessibility-risicosignalen onder Design; geen WCAG-conformiteitsclaim.
- `design-baseline`: vóór redesign, cleanup, before/after, design-engineeringhandoff of een formele ontwerpclaim wanneer nog geen passende actuele baseline bestaat.
- `design-diff`: wanneer twee vergelijkbare screenshots beschikbaar zijn en een before/after- of regressievergelijking nodig is.

Designchecker wordt niet automatisch gebruikt voor puur tekstueel designadvies, een expliciete Figma/Canva/Product Design/ImageGen-bestemming, implementatie-only werk of een onafhankelijke QA-eindclaim.

## Engines zonder eigen leveranciersaccount/API-key

- Playwright: browsercapture en DOM/runtime-inspectie.
- axe-core: automatische accessibility-risico's.
- Lighthouse: labmetingen.
- Pixelmatch + Sharp: screenshotregressie.
- Nu HTML Checker (`vnu-jar`): markupvalidatie.
- Native fetch: begrensde linkcontrole.
- Python/Node standaardruntime: bounded SEO- en JSON-inspectie.

## Huidige harde blokkers

- Project SEO: de runtime is bewezen, maar de live Drive-audit heeft manifest/checksumdrift gevonden. SEO-direct commands zijn geblokkeerd totdat die canonieke bronset is gereconcilieerd en opnieuw gehasht.
- Formele Leads-scan: Project Leads 10.5.0 vereist `webactueel-leadscanner-ingest/1.0` provenance plus artifact-readback. `lead-formal` blijft geblokkeerd totdat Designchecker dat exacte contract implementeert en valideert. De gewone `leads` route blijft alleen supportbewijs na Lead Registry-preflight.

## Lokale ontwikkeling

```bash
npm install
npm run setup:browsers
npm run build
npm test
npm run smoke
```

Lokale installatie is alleen voor ontwikkeling; de normale ChatGPT-Web route draait op GitHub Actions.

## Optioneel MCP

De bestaande MCP-server blijft als optionele backwards-compatible interface aanwezig (`npm run mcp:http`), maar is niet nodig voor de standaard ChatGPT-Web uitvoering.

## Bewijsgrenzen

- Automatische tools leveren signalen en reproduceerbare evidence, geen garantie.
- axe-core bewijst geen volledige WCAG-conformiteit.
- Lighthouse is labdata en geen field-CWV-bewijs.
- Designinspectie bewijst geen usability of conversiewinst.
- Visual diff detecteert verschil, niet of een wijziging wenselijk is.
- Leads verstuurt nooit automatisch e-mail en formele kwalificatie vereist het geldige Leads-contract.
- Runtime-GO/No-Go blijft bij `website-qa-checklist`.
