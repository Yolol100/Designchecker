# Project Design-bronnen

Versie: `2026-08-15.1-diagram-semantic-motion`

Canonieke bronset voor ontwerpstrategie, user research, UX/UI, IA, conversie, formulieren, design systems, accessibility-risico's, brongekoppelde designreviews, Figma, evidence en handoff.

## Runtime-activatie voor nieuwe chats

Gebruik deze bootstrap vóór externe Design-uitvoering:

1. Laat `design` de vakowner blijven. `Designchecker` is nooit een tweede owner.
2. Lees het live Project Design-manifest en kies minimaal één taakrelevante bronselector.
3. Kies `designchecker-direct` alleen wanneer gecontroleerde runtime- of deterministische artifact-evidence de ontwerpbeslissing, het risico of de acceptatie werkelijk kan veranderen.
4. Gebruik `design` voor rendered-page inspectie; `a11y` voor geautomatiseerde accessibility-risicosignalen; `design-baseline` vóór redesign, cleanup, before/after of een bewijsclaim; `design-diff` alleen met persistente vergelijkbare evidence.
5. Gebruik Designchecker niet voor pure strategie/briefing, expliciete Figma/Canva/Product Design/ImageGen-output, implementatie-only werk of onafhankelijke QA-acceptatie.
6. Vereis geverifieerde live bronintegriteit, exact Project Design-manifest-ID `12g8WkgS_ICPBKW6U3OO2h1ksB8nbKPLg`, actuele bronset en een toegestane selector. Zonder geldige broncontext: niet uitvoeren.
7. Gebruik de directe ChatGPT-Web-route via `Yolol100/Designchecker` en `requests/command.json`; geen MCP, tunnel, API-key of extra account is vereist voor deze route.
8. Laat resultaten teruggaan naar `design`; Website QA blijft eigenaar van onafhankelijke browser/AT- en releaseacceptatie.

De machineleesbare uitvoeringswaarheid voor deze runtime staat in `Yolol100/Designchecker/config/designchecker-integration-contract.json` en `config/direct-command-registry.json`. Bij verschil wint het live Project Design-manifest voor projectinhoud en de Design-Skill voor vakmethode; Designchecker levert alleen bewijs.

## Bronstructuur

- `00-core/` bevat één verantwoordelijkheid per bron en de machineleesbare checklistcatalogus/schema's.
- `10-sources/` bevat bronhiërarchie en machineleesbaar register.
- `20-evidence/` bevat audit- en workflowbewijs, geen actief ontwerpbeleid.
- `contracts/` bevat handoffcontract 2.0 en schema.
- Gelijknamige Skill-references zijn gegenereerde bytegelijke mirrors.
- Een source-level checklist bewijst geen runtimegedrag, WCAG-conformiteit, compliance of productie-GO.
