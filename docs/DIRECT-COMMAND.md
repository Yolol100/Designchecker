# Direct ChatGPT Web command route

Dit is de standaarduitvoering voor normale ChatGPT Web. Geen MCP, tunnel, API-key of extra leveranciersaccount is nodig; de route gebruikt de bestaande GitHub-app en GitHub Actions.

## Contract

1. `webactueel-workflow` resolveert doel -> domain owner -> geregistreerd live Drive-manifest -> taakrelevante selector -> capability.
2. ChatGPT leest live Drive en zet alleen `source_context.integrity_status=verified` wanneer owner, project-ID, manifest-ID en actieve bronset werkelijk kloppen.
3. `config/project-source-bindings.json` vereist het exacte manifest-ID en kan een project bij bronconflict volledig blokkeren.
4. Voor Leads gebeurt Lead Registry-preflight vóór browser-supportbewijs.
5. ChatGPT schrijft `requests/command.json` via de verbonden GitHub-app.
6. De push naar `main` triggert `.github/workflows/command.yml`.
7. `scripts/run-command.mjs` valideert opnieuw owner, project, commandstatus, bronfreshness, manifestidentiteit en preconditions.
8. De geselecteerde target-read-only capability draait op GitHub Actions; browserloze commands installeren geen Chromium.
9. Evidence wordt gecommit naar `results/<request_id>.json`.
10. De owning Skill interpreteert evidence. Website QA bezit onafhankelijke geïntegreerde releaseacceptatie waar vereist.

## Beschikbaarheid

- Design: `design`, `a11y` — ready wanneer Project Design live bronintegriteit geldig is.
- SEO: `seo`, `seo-technical`, `links`, `performance`, `html` — runtime bewezen, maar momenteel projectbreed geblokkeerd wegens live Project SEO manifest/checksumdrift.
- Elementor: `elementor`, `elementor-json` — ready met live Project Elementor-broncontext.
- Leads support: `leads` — alleen na geverifieerde Lead Registry-preflight; geen formele kwalificatie.
- Leads formal: `lead-formal` — geblokkeerd totdat `webactueel-leadscanner-ingest/1.0` provenance + artifact-readback exact is geïmplementeerd en gevalideerd.
- WordPress/Programmeren: `performance`, `html` — ready; `wordpressqualityarchitect` blijft code/release-owner.
- Website QA: `qa`, `a11y`, `links`, `performance`, `html` — ready; Website QA blijft acceptance-owner.

## Bewijsgrens

`seo-technical` is bewust bounded current-page technical evidence; het wordt niet als volledige functionele kopie van de oude seochecker-crawlstack geclaimd. Gedeelde tools leveren meetbewijs maar nemen geen vakbesluit over van de Skill.

Commands wijzigen de doelsite nooit. Een command zonder geldige, actuele, bronintegere live-source context wordt geweigerd.
