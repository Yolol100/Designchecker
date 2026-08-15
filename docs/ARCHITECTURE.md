# Architectuur

## Principe

Volg altijd `doel -> owner -> projectbron -> capability -> bewijs`.

`Designchecker` is de centrale target-read-only uitvoer- en bewijslaag. Hij verandert niet wie inhoudelijk eigenaar is en bevat geen projectwaarheid die al in Drive wordt beheerd.

## Lagen

1. `config/` - owner-, capability-, direct-command- en exacte projectbronbindings.
2. `src/core/` - gedeelde URL-, DNS-, evidence- en browserveiligheid.
3. `src/tools/` - kleine read-only meetfuncties.
4. `scripts/` - direct-command dispatcher en begrensde specialistadapters.
5. `.github/workflows/command.yml` - standaard ChatGPT-Web runtime via GitHub Actions.
6. `tests/` + `.github/workflows/ci.yml` - regressie- en browser-smokegates.
7. `src/mcp/` - optionele backwards-compatible interface; niet vereist voor ChatGPT Web.

## Skill-adapters

- Design: design system, hiërarchie, states, responsive risico's en accessibility-signalen.
- SEO: bounded on-page/technical evidence plus gedeelde links/performance/HTML-tools; inhoudelijke SEO-besluiten blijven bij `seo`.
- Elementor: gerenderde signalen en statische Elementor-JSON-audit.
- Leads: publieke supportsignalen na Registry-preflight; formele provenance blijft contractgebonden.
- Website QA: geïntegreerde evidence; productie-GO blijft bij `website-qa-checklist`.
- Programmeren/WordPress: gedeelde technische evidence; `wordpressqualityarchitect` blijft implementatie-, security- en release-owner.

## Veiligheid

- Alleen publieke `http:`/`https:` targets.
- Localhost/private IP en DNS-resolutie naar geblokkeerde private/loopback ranges standaard geblokkeerd.
- Geen formulieren, login, account-enumeratie of sitewijzigingen.
- Geen secrets in registries of output.
- Projectbronintegriteit is een aparte uitvoerpoort: gezonde code mag een bronconflict niet omzeilen.
