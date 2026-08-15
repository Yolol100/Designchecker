# Architectuur

## Principe

Volg altijd `doel -> owner -> projectbron -> capability -> bewijs`.

De repository is een capabilitylaag. Hij verandert niet wie inhoudelijk eigenaar is en bevat geen klant- of projectwaarheid die al in Drive wordt beheerd.

## Lagen

1. `config/` - declaratieve owner-, capability- en pluginregistries.
2. `src/core/` - gedeelde URL-, evidence- en browserveiligheid.
3. `src/tools/` - kleine read-only meetfuncties.
4. `src/mcp/` - één MCP-server die dezelfde functies als tools publiceert.
5. `tests/` - regressietests voor harde grenzen.
6. `.github/workflows/` - compile/test gate.

## Skill-adapters

- Design: design system, hiërarchie, states, responsive risico's, baseline.
- SEO: metadata, headings, canonical, robots, structured data, links.
- Elementor: Elementor-signalen, widgets, containers, responsive hidden classes.
- Leads: publieke contact- en bedrijfswebsite-signalen; geen verzending.
- Checklist: bundelt evidence; geeft geen productie-GO.
- Programmeren/WordPress: gebruikt gedeelde technische evidence maar krijgt geen automatische write-capability.

## Veiligheid

- Alleen `http:` en `https:` targets.
- `localhost` en private IP-targets zijn standaard geblokkeerd.
- Zet `ALLOW_PRIVATE_TARGETS=1` alleen bewust voor lokale/stagingtests.
- Geen formulieren verzenden, geen login automatiseren, geen sitewijzigingen.
- Geen secrets in registries of output.
