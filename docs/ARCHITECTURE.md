# Architectuur

## Principe

Volg altijd:

`doel → eigenaar → live projectbron → benodigde evidence → kleinste capability → bewijs`

Designchecker is een gedeelde, target-read-only browser- en evidence-runtime. Hij verandert geen inhoudelijk eigenaarschap, vervangt geen projectbron en wordt geen universele uitvoerder voor andere specialistische repositories.

## Verantwoordelijkheid

Designchecker levert waar nodig:

- publieke browserobservatie;
- accessibility-signalen via axe;
- Lighthouse-labmetingen;
- HTML-validatie en linkchecks;
- screenshots, baselines en deterministische visual diffs;
- run-scoped evidence voor `design` en `website-qa-checklist`.

De ontvangende Skill interpreteert het bewijs. Website QA blijft eigenaar van onafhankelijke acceptatie en Go/No-Go.

## Wat Designchecker niet vervangt

- `Yolol100/seochecker` — volledige technische SEO-crawl en regressiebundel.
- `Yolol100/elementorjson` — importer-roundtrip, pinned Elementor-runtime en native Kit-contracten.
- `Yolol100/programmeren` — WordPress-code-, dependency-, Plugin Check- en controlled-runtime-audit.
- `Yolol100/Leadscanner` — expliciet buiten deze simplificatie.
- `Yolol100/wordpressconnector` — live WordPress read/write/rollback.

Alleen `Yolol100/Checklist` is een consolidatiekandidaat. Die route blijft actief totdat Designchecker aantoonbaar dezelfde raw evidence, formele manifestfinalisatie, privacyguards, request/run-correlatie en Website-QA-acceptatie levert. Zie `CHECKLIST-MIGRATION.md`.

## Lagen

1. `config/` — capability-, route-, bronbinding- en migratiecontracten.
2. `src/core/` — gedeelde URL-, DNS-, evidence- en browserveiligheid.
3. `src/tools/` — begrensde read-only meetfuncties.
4. `scripts/run-command.mjs` — Design-only direct-command dispatcher.
5. `.github/workflows/command.yml` — gecontroleerde GitHub Actions-runtime.
6. `tests/` en CI — routing-, contract-, browser- en regressiegates.
7. `src/mcp/` — optionele backwards-compatible interface; niet vereist voor ChatGPT Web.

## Veiligheid

- Alleen publieke HTTP(S)-targets.
- Blokkeer localhost, private/special-purpose ranges en DNS-resolutie naar geblokkeerde adressen.
- Voer geen formulieren, login, accountenumeratie of sitewijzigingen uit.
- Bewaar geen secrets of projectwaarheid in registries of artifacts.
- Een technisch gezonde run mag bron-, owner-, privacy- of acceptatiepoorten nooit omzeilen.
