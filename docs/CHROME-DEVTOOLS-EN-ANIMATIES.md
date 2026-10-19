# Chrome DevTools en Designchecker

## Wat is daadwerkelijk aanwezig?
- **Playwright** is al geinstalleerd via `package.json`/`package-lock.json`: browserinspectie en screenshots.
- **Pixelmatch + Sharp** zijn al geinstalleerd: pixelverschillen tussen gelijkwaardige screenshots.
- **Chrome DevTools MCP** is alleen **optioneel geconfigureerd** in `.mcp.json` (`chrome-devtools-mcp@1.11.0`). Een geschikte MCP-client start het op aanvraag via `npx`; het is niet op je pc geinstalleerd door deze commit.
- Er zijn **geen** nieuwe npm-dependencies en geen tweede launcher toegevoegd.

## Gebruik
1. Controleer eerst het `.mcp.json`-bestand en vertrouw de repository alleen als je de server wilt starten.
2. Open de repository in een MCP-geschikte editor, zoals VS Code met een geschikte agent, en start de server via **MCP: List Servers**.
3. Voor de bestaande scanner: `npm ci`, `npm run setup:browsers`, `npm run build`, `npm test`, `npm run smoke`.
4. Na het bouwen: `node dist/src/cli.js design https://example.com` (publieke pagina).

## Wat bewijst de scan?
De bestaande Designchecker `design`-route verzamelt nu aanvullend maximaal **120** zichtbare elementstijlen (fonts, kleuren, positie, achtergrond, CSS-transities/animaties), maximaal **80** actieve Web Animations en maximaal **30** videostatussen. Dit zijn **momentopnamen**: geen bewijs van een hover-animatie, autoplay, scroll-trigger of Swiper-configuratie. Die interacties moeten apart daadwerkelijk worden getest.

De bestaande `baseline`-screenshots schakelen animaties bewust uit voor stabiele pixelvergelijkingen; gebruik andere opnamen voor bewegingsanalyse.

## Veiligheidsgrenzen
- De Designchecker-route beschermt publieke targets en blokkeert schrijfverzoeken op netwerkverkeer.
- De **afzonderlijke Chrome DevTools MCP-server** heeft die Designchecker-read-only-garantie niet: gebruik een geisoleerde browser zonder priveaccounts en controleer agenttoestemmingen.
- De MCP-config blokkeert navigatie naar `file:`-URL's en redigeert bepaalde gevoelige netwerkheaders. Dit is **geen** volledig read-only beleid of filesystem-sandbox.
- Deze configuratie installeert geen ChatGPT-plugin en koppelt Chrome niet rechtstreeks aan een normale ChatGPT-webchat.
- Bewaar geen klantbestanden, tokens of scans in de publieke standaardbranch. Tests of screenshots bewijzen niet vanzelf productie- of pixel-perfecte kwaliteit.

Bronnen: https://github.com/ChromeDevTools/chrome-devtools-mcp en https://code.visualstudio.com/docs/agent-customization/mcp-servers
