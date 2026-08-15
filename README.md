# Designchecker / Webactueel Evidence Stack

Centrale read-only uitvoer- en bewijslaag voor Webactueel-specialisten. De Skills blijven inhoudelijk eigenaar; de geregistreerde Google Drive-manifesten blijven projectwaarheid.

## Standaardroute in ChatGPT Web

Geen custom MCP, tunnel, API-key of extra leveranciersaccount nodig. De standaardroute gebruikt de al verbonden GitHub-app en Google Drive-bronnen:

`vraag -> webactueel-workflow -> domain owner -> live Drive-manifest -> capability -> requests/command.json -> GitHub Actions -> results/<request_id>.json -> owning Skill`

- `webactueel-workflow` blijft controller.
- Design, SEO, Elementor, Programmeren/WordPress, Leads en Website QA blijven hun eigen owner.
- `config/project-source-bindings.json` bindt elke route aan het exacte geregistreerde Drive-manifest-ID.
- `config/direct-command-registry.json` legt vast wanneer een command mag draaien, waarvoor, met welke tool en onder welke preconditions.
- `scripts/run-command.mjs` weigert verkeerde owner/project/manifest-koppelingen, niet-geverifieerde broncontext en broncontext ouder dan 24 uur.
- `.github/workflows/command.yml` draait automatisch na een wijziging van `requests/command.json` op `main` en commit evidence terug naar `results/`.

Zie `docs/DIRECT-COMMAND.md` en `docs/CHATGPT-WEB.md`.

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
- Leads verstuurt nooit automatisch e-mail en formele kwalificatie vereist het geldige Leads-contract.
- Runtime-GO/No-Go blijft bij `website-qa-checklist`.
