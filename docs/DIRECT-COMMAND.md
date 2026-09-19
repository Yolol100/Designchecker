# Direct ChatGPT Web command route

Dit is de standaarduitvoering voor normale ChatGPT Web. Geen MCP, tunnel, API-key of extra leveranciersaccount is nodig; de route gebruikt de bestaande GitHub-app en GitHub Actions.

## Contract

1. `webactueel-workflow` resolveert doel -> domain owner -> geregistreerd live Drive-manifest -> taakrelevante selector -> bewijsbehoefte -> capability.
2. ChatGPT leest live Drive en zet alleen `source_context.integrity_status=verified` wanneer owner, project-ID, manifest-ID en actieve bronset werkelijk kloppen.
3. Voor source-selector-bound routes bevat `source_context.selector_ids` minimaal één selector die voor het gekozen command is toegestaan.
4. `config/project-source-bindings.json` vereist het exacte manifest-ID en kan een project bij bronconflict volledig blokkeren.
5. `config/designchecker-integration-contract.json` bepaalt wanneer Designchecker wel/niet mag worden gekozen en waarom; Designchecker wordt nooit vakowner.
6. ChatGPT maakt een tijdelijke `runtime/**`-branch en schrijft daar `requests/command.json` via de verbonden GitHub-app.
7. De push op die runtimebranch triggert `.github/workflows/command.yml`; `main` blijft vrij van prospecttargets en runresidue.
8. `scripts/run-command.mjs` valideert opnieuw owner, project, commandstatus, bronfreshness, manifestidentiteit, selectors en preconditions.
9. De geselecteerde target-read-only capability draait op GitHub Actions; browserloze commands installeren geen Chromium.
10. GitHub Actions uploadt `results/` als tijdelijk artifact `designchecker-command-<run_number>` met 7 dagen retentie. `results/<request_id>.json` en eventuele screenshots onder `results/evidence/<request_id>/` bestaan binnen dat artifact en worden niet naar `main` gecommit.
11. Na completion verwijdert `.github/workflows/runtime-cleanup.yml` de tijdelijke `runtime/**`-branch. Het 7-daagse artifact blijft beschikbaar voor readback; cleanup verwijdert geen evidence-artifact.
12. De owning Skill leest eerst workflowstatus én het artifact terug. Een groene workflow bewijst alleen dat de runtime slaagde; een visuele claim vereist ook de daadwerkelijke screenshot-/render-evidence.
13. De owning Skill interpreteert evidence. Website QA bezit onafhankelijke geïntegreerde releaseacceptatie waar vereist.

## Design

Designchecker wordt alleen gebruikt nadat `design` als owner is gekozen en Project Design live is gelezen.

- `design`: rendered-page UX/UI-inspectie wanneer runtime-layout, hiërarchie, componenten, formulieren, CTA's of overflow de ontwerpbeslissing kunnen veranderen.
- `a11y`: geautomatiseerde accessibility-risicosignalen; geen WCAG-conformiteitsclaim.
- `design-baseline`: vóór redesign, cleanup, before/after, design-engineeringhandoff of een claim waarvoor een actuele reproduceerbare baseline nodig is. Desktop-, tablet- en mobilecaptures staan tijdens de run onder `results/evidence/<request_id>/baseline/` en worden daarna alleen als tijdelijk Actions-artifact bewaard.
- `design-diff`: twee bestaande vergelijkbare screenshots onder `results/evidence/` vergelijken. Alleen bestaande evidencebestanden zijn toegestaan; willekeurige repositorypaden worden geweigerd. Het verschil is bewijs van verandering, niet automatisch van verbetering.

Designcommands vereisen een passende Project Design-selector. Voorbeelden: `quality-audit`, `system-accessibility`, `evidence-baseline`, `handoff`, `design-engineering`, `claims-scoring`.

Niet automatisch gebruiken wanneer een tekstuele Design-beslissing volstaat, Figma/Canva/Product Design/ImageGen expliciet de uitvoerbestemming is, implementatie-only werk gevraagd is of onafhankelijke QA de echte acceptatie moet leveren.

## Overige beschikbaarheid

De directe Designchecker-runtime is bewust Design-only. SEO, Elementor, Leads, Website QA en WordPress/Programmeren gebruiken hun eigen owner-repositories en contracten. Een Leads-flow die visueel bewijs nodig heeft routeert daarom via `Leads -> webactueel-workflow -> design -> Designchecker -> webactueel-workflow -> Leads`; Designchecker draait nooit als `owner=leads`.

## Bewijsgrens

`seo-technical` is bewust bounded current-page technical evidence; het wordt niet als volledige functionele kopie van de oude seochecker-crawlstack geclaimd. Gedeelde tools leveren meetbewijs maar nemen geen vakbesluit over van de Skill.

Commands wijzigen de doelsite nooit. Een command zonder geldige, actuele, bronintegere live-source context wordt geweigerd.
