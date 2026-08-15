# Designchecker / Webactueel Evidence Stack

Centrale monorepo voor gedeelde, read-only webtools die bewijs verzamelen voor de Webactueel-specialisten. De tools nemen geen vakbeslissingen over van de Skills.

## Eigenaars

- `design` - UX/UI, IA, conversie, design systems en designbesluiten.
- `seo` - organische SEO en zoekmachinebeleid.
- `elementor` - Elementor-opbouw, templates en imports.
- `wordpressqualityarchitect` - WordPress/programmeren en release-engineering wanneer die route expliciet eigenaar is.
- `leads` - leadkwalificatie en draft-only outreachbeleid.
- `website-qa-checklist` - onafhankelijke runtime-QA en releasebesluit.
- `webactueel-workflow` - controller voor multi-owner workflows.

Projectwaarheid blijft in de geregistreerde Google Drive-projectbronnen. Deze repository bevat code, adapters, schema's, registries en tests, maar maakt geen tweede projectwaarheid.

## Ingebouwde gratis tooling

Alles hieronder werkt zonder leveranciersaccount of API-key:

- Playwright - browsercapture en DOM/runtime-inspectie.
- axe-core - automatische accessibility-risico's.
- Lighthouse - labmetingen voor performance, accessibility, best practices en SEO.
- Pixelmatch + Sharp - screenshotregressie.
- Nu HTML Checker (`vnu-jar`) - HTML-validatie.
- Eigen link checker - statuscontrole van links zonder externe dienst.
- MCP TypeScript SDK - één toolserver voor ChatGPT/Work/Codex wanneer de surface een custom MCP-endpoint ondersteunt.

## Installatie

```bash
npm install
npm run setup:browsers
npm run build
```

Node.js 22.19+ is vereist door de actuele Lighthouse-toolchain.

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

## MCP

HTTP:

```bash
npm run mcp:http
```

Stdio:

```bash
npm run mcp:stdio
```

De MCP-tools zijn bewust read-only. Voor ChatGPT Web moet de HTTP-server bereikbaar zijn via HTTPS; zie `docs/CHATGPT-WEB.md`.

## Bewijsgrens

- Automatische tools leveren signalen en reproduceerbare evidence, geen garantie.
- axe-core bewijst geen WCAG-conformiteit.
- Lighthouse is labdata en geen vervanging voor field data.
- Designinspectie bewijst geen usability of conversiewinst.
- Runtime-GO blijft bij `website-qa-checklist`.
