# ChatGPT Web koppeling

Deze repo bevat één MCP HTTP-server op `/mcp`. De repository alleen installeert of activeert geen ChatGPT-plugin.

## Vereiste keten

1. De code staat op `main` en CI is groen.
2. Start of host de MCP-server.
3. Maak `/mcp` via HTTPS bereikbaar.
4. Voeg die HTTPS-MCP endpoint toe op een ChatGPT-surface die custom MCP ondersteunt.
5. Controleer runtime-exposure voordat een Skill de capability als uitvoerbaar behandelt.

Standaard bindt de server alleen op `127.0.0.1` en accepteert hij alleen localhost-hostheaders. Voor een tunnel of remote host moet `MCP_ALLOWED_HOSTS` expliciet de publieke hostname bevatten. `MCP_ALLOWED_ORIGINS` kan optioneel verder beperken. De tool zelf vereist geen leveranciersaccount of API-key; een gekozen hosting- of tunnelmethode kan wel eigen voorwaarden hebben.

## Routing

`webactueel-workflow` bepaalt eerst de `domain_owner`. Projectspecifiek werk leest vervolgens het geregistreerde live Drive-manifest en alleen de relevante selectorbronnen. Pas daarna wordt een tool uit `config/tool-routing.json` gekozen. De MCP-toolbeschrijvingen herhalen deze owner- en bronvoorwaarde om verkeerde automatische selectie te beperken.

## Veiligheid

- Doelsites worden niet gewijzigd.
- Private/local literal targets worden standaard geblokkeerd.
- MCP-artifactpaden blijven binnen `ARTIFACT_DIR`.
- Writes naar Figma, WordPress, Elementor, Gmail, Drive of productie horen bij bestaande Skill/app-routes.
- De Leads-route vereist eerst de Lead Registry en verstuurt nooit automatisch e-mail.
- Website QA blijft eigenaar van runtime-GO/No-Go.
