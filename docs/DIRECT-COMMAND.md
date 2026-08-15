# Direct ChatGPT Web command route

Dit is de standaarduitvoering voor normale ChatGPT Web. Geen MCP, tunnel, API-key of extra leveranciersaccount is nodig; de route gebruikt de bestaande GitHub-app en GitHub Actions.

## Contract

1. `webactueel-workflow` resolveert doel -> domain owner -> geregistreerd live Drive-manifest -> taakrelevante selector -> bewijsbehoefte -> capability.
2. ChatGPT leest live Drive en zet alleen `source_context.integrity_status=verified` wanneer owner, project-ID, manifest-ID en actieve bronset werkelijk kloppen.
3. Voor source-selector-bound routes bevat `source_context.selector_ids` minimaal één selector die voor het gekozen command is toegestaan.
4. `config/project-source-bindings.json` vereist het exacte manifest-ID en kan een project bij bronconflict volledig blokkeren.
5. `config/designchecker-integration-contract.json` bepaalt wanneer Designchecker wel/niet mag worden gekozen en waarom; Designchecker wordt nooit vakowner.
6. Voor Leads gebeurt Lead Registry-preflight vóór browser-supportbewijs.
7. ChatGPT schrijft `requests/command.json` via de verbonden GitHub-app.
8. De push naar `main` triggert `.github/workflows/command.yml`.
9. `scripts/run-command.mjs` valideert opnieuw owner, project, commandstatus, bronfreshness, manifestidentiteit, selectors en preconditions.
10. De geselecteerde target-read-only capability draait op GitHub Actions; browserloze commands installeren geen Chromium.
11. Evidence wordt gecommit naar `results/<request_id>.json`; gegenereerde screenshots/diffs staan onder `results/artifacts/<request_id>/`.
12. De owning Skill interpreteert evidence. Website QA bezit onafhankelijke geïntegreerde releaseacceptatie waar vereist.

## Design

Designchecker wordt alleen gebruikt nadat `design` als owner is gekozen en Project Design live is gelezen.

- `design`: rendered-page UX/UI-inspectie wanneer runtime-layout, hiërarchie, componenten, formulieren, CTA's of overflow de ontwerpbeslissing kunnen veranderen.
- `a11y`: geautomatiseerde accessibility-risicosignalen; geen WCAG-conformiteitsclaim.
- `design-baseline`: vóór redesign, cleanup, before/after, design-engineeringhandoff of een claim waarvoor een actuele reproduceerbare baseline nodig is.
- `design-diff`: twee vergelijkbare screenshots onder `requests/inputs/` vergelijken; verschil is bewijs van verandering, niet automatisch van verbetering.

Designcommands vereisen een passende Project Design-selector. Voorbeelden: `quality-audit`, `system-accessibility`, `evidence-baseline`, `handoff`, `design-engineering`, `claims-scoring`.

Niet automatisch gebruiken wanneer een tekstuele Design-beslissing volstaat, Figma/Canva/Product Design/ImageGen expliciet de uitvoerbestemming is, implementatie-only werk gevraagd is of onafhankelijke QA de echte acceptatie moet leveren.

## Overige beschikbaarheid

- SEO: `seo`, `seo-technical`, `links`, `performance`, `html` — runtime bewezen, maar momenteel projectbreed geblokkeerd wegens live Project SEO manifest/checksumdrift.
- Elementor: `elementor`, `elementor-json` — ready met live Project Elementor-broncontext.
- Leads support: `leads` — alleen na geverifieerde Lead Registry-preflight; geen formele kwalificatie.
- Leads formal: `lead-formal` — geblokkeerd totdat `webactueel-leadscanner-ingest/1.0` provenance + artifact-readback exact is geïmplementeerd en gevalideerd.
- WordPress/Programmeren: `performance`, `html` — ready; `wordpressqualityarchitect` blijft code/release-owner.
- Website QA: `qa`, `a11y`, `links`, `performance`, `html` — ready; Website QA blijft acceptance-owner.

## Bewijsgrens

`seo-technical` is bewust bounded current-page technical evidence; het wordt niet als volledige functionele kopie van de oude seochecker-crawlstack geclaimd. Gedeelde tools leveren meetbewijs maar nemen geen vakbesluit over van de Skill.

Commands wijzigen de doelsite nooit. Een command zonder geldige, actuele, bronintegere live-source context wordt geweigerd.
