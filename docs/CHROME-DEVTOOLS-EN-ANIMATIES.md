# Gratis browsertools voor Designchecker

## Status en taken
- **Playwright**: al aanwezig in `package.json` + lockfile; controleert de echte webpagina via Chromium.
- **Pixelmatch + Sharp**: al aanwezig; vergelijkt screenshots met gelijke afmetingen.
- **Chrome DevTools MCP**: **optionele lokale koppeling**, vastgezet op `chrome-devtools-mcp@1.11.0` via `.mcp.json`. Hiervoor is **geen wijziging van package-lock.json** nodig. Via `npx` wordt de software pas bij de eerste start gedownload.
- **GSAP**: animatiebibliotheek voor het **doelthema / frontend**, niet voor de read-only inspectie-repo. Voeg GSAP en ScrollTrigger alleen aan het aparte klantthema toe wanneer de bronanimatie dit vereist.

## Installeren / gebruiken (lokaal in VS Code)
1. Installeer Node.js LTS en Chrome.
2. Open de uitgecheckte Designchecker-map in VS Code.
3. Vertrouw de workspace pas nadat je de instellingen hebt bekeken.
4. Kies **MCP: List Servers** of **Chat: Open Customizations > MCP Servers**, en start `chrome-devtools` uit `.mcp.json`.
5. Alternatief: `npm run devtools:mcp` om dezelfde server in een MCP-geschikte terminalclient te starten.
6. Voor de bestaande Designchecker-tests: `npm ci`, `npm run build`, `npm test`, `npx playwright install chromium`, `npm run smoke`.

`chrome-devtools-mcp` is **niet** automatisch een ChatGPT-plugin. Een ondersteunde MCP-client of lokale agent moet de server actief starten. De instellingen zijn repo-scope, niet automatisch op iemands pc geinstalleerd.

## Zelf een publieke website onderzoeken
```sh
npm ci
npm run setup:browsers
npm run build
node dist/src/cli.js design https://example.com
node dist/src/cli.js baseline https://example.com results/evidence/local-baseline
```
De standaard `design`-inspectie verzamelt naast layout en CTA's nu ook fonts, kleurwaarden, CSS-transities, de Web Animations API, videostatus, Swiper-instellingen (wanneer zichtbaar) en beperkte hover-bewijssamples. Dit **meet** zaken, maar bewijst niet automatisch dat een bepaalde overgang zichtbaar is afgespeeld. De screenshots van `baseline` schakelen animaties bewust uit voor stabiele pixeldiffs; animatie-inventarisatie is een aparte bewijssoort.

## Grenzen en veiligheid
- Behoud de read-only netwerkbeperking (POST/PUT/PATCH/DELETE niet uitvoeren).
- Scan alleen publiek toegankelijke/expliciet geautoriseerde websites. Respecteer gebruiksvoorwaarden en beeldrechten.
- De Chrome DevTools MCP-server heeft potentieel lees- en schrijfbevoegdheid in zijn **eigen geisoleerde browser**. Gebruik niet je persoonlijke browserprofiel met ingelogde accounts.
- Schrijf geen klantdoelen, screenshots of tokens naar `main`: Designchecker gebruikt tijdelijke runtime-branches en run-artifacts.
- Een `npm ci`/groene CI bewijst nog geen pixel-perfecte website. Vergelijk gelijkwaardige viewports en interactiestaten en beoordeel verschillen.
- LocalWP is een **aparte** lokale WordPress-installatie; verbinding op een gebruikers-pc vereist nog een geautoriseerde desktopagent. De publieke Designchecker URL-validator laat lokale/private doelen bewust niet toe.

## Referenties
- https://github.com/ChromeDevTools/chrome-devtools-mcp
- https://code.visualstudio.com/docs/agent-customization/mcp-servers
- https://playwright.dev/
- https://github.com/mapbox/pixelmatch
- https://gsap.com/docs/v3/Plugins/ScrollTrigger/
