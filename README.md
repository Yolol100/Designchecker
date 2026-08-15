# Designchecker / Webactueel Evidence Stack

Centrale monorepo voor gedeelde, target-read-only webtools die bewijs verzamelen voor Webactueel-specialisten. De tools nemen geen vakbeslissingen over van de Skills.

## Routing

Vaste keten: `doel -> domain_owner -> live projectbron -> taakrelevante selector -> capability -> tool -> evidence`.

- `webactueel-workflow` blijft controller.
- Design, SEO, Elementor, Programmeren/WordPress, Leads en Website QA blijven hun eigen vakowner.
- Projectwaarheid blijft in de geregistreerde Google Drive-manifesten; deze repo kopieert die inhoud niet.
- `config/tool-routing.json` koppelt iedere MCP-tool aan owner, project-ID, bronselector-kandidaten, trigger, uitsluitingen en evidencelevel.
- `config/skill-registry.json` en `config/capability-registry.json` bewaken owner/capability-consistentie.

Zie `docs/ROUTING.md`.

## Gratis/no-key engines

- Playwright: browsercapture en DOM/runtime-inspectie.
- axe-core: automatische accessibility-risico's.
- Lighthouse: labmetingen.
- Pixelmatch + Sharp: screenshotregressie.
- Nu HTML Checker (`vnu-jar`): markupvalidatie.
- Native fetch: begrensde linkcontrole.
- MCP TypeScript SDK: één custom toolserver.

Deze engines hebben zelf geen leveranciersaccount of API-key nodig.

## Installatie

```bash
npm install
npm run setup:browsers
npm run build
npm test
npm run smoke
```

## CLI

```bash
npm run dev -- design https://example.com
npm run dev -- seo https://example.com
npm run dev -- a11y https://example.com
npm run dev -- elementor https://example.com
npm run dev -- leads https://example.com
npm run dev -- qa https://example.com
npm run dev -- performance https://example.com
npm run dev -- html https://example.com
npm run dev -- baseline https://example.com ./artifacts/example
npm run dev -- diff ./before.png ./after.png ./artifacts/diff.png
```

## MCP / ChatGPT Web

```bash
npm run mcp:http
```

De repository alleen maakt de tools nog niet oproepbaar in ChatGPT Web. Daarvoor moet `/mcp` als bereikbare HTTPS custom MCP-capability op een ondersteunde ChatGPT-surface worden toegevoegd en runtime-exposure slagen. Zie `docs/CHATGPT-WEB.md`.

## Bewijsgrenzen

- Automatische tools leveren signalen en reproduceerbare evidence, geen garantie.
- axe-core bewijst geen WCAG-conformiteit.
- Lighthouse is labdata en geen field-CWV-bewijs.
- Designinspectie bewijst geen usability of conversiewinst.
- Leads leest alleen publieke signalen; Lead Registry en draft-only beleid blijven leidend.
- Runtime-GO/No-Go blijft bij `website-qa-checklist`.
