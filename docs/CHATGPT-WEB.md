# ChatGPT Web koppeling

Deze repo bevat één MCP HTTP-server op `/mcp`.

## Zonder nieuw leveranciersaccount

1. Start lokaal: `npm run mcp:http`.
2. Maak het endpoint tijdelijk via HTTPS bereikbaar.
3. Voeg de HTTPS `/mcp` URL alleen toe op een ChatGPT-surface/plan die custom MCP ondersteunt.

Een lokale `localhost` URL is niet rechtstreeks bereikbaar vanuit ChatGPT Web.

## Toolbeleid

De server publiceert alleen read-only evidence-tools. Writes naar Figma, WordPress, Elementor, Gmail, Drive of productie horen bij hun bestaande app/Skill-route en staan bewust niet in deze MCP-server.
