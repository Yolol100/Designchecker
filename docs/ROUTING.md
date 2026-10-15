# Designchecker - compact routingcontract

**Volgorde:** doel -> vakowner -> live projectmanifest -> taakselectie -> tool -> bewijs -> eigenaar. `webactueel-workflow` coordineert; deze repository voert alleen bounded read-only browser-/designbewijs uit, nooit zelfstandig Go/No-Go of productiebeheer.

## Eigenaarschap

- `config/project-source-bindings.json` hoort uitsluitend bij Project Design; QA/SEO/Elementor/Programmeren gebruiken hun eigen live bronnen via de controller.
- `config/direct-command-registry.json` en `config/tool-routing.json` bepalen de uitvoerbare Design-routes. Een gedeelde tool wordt geen tweede owner; Leads en andere vakroutes behouden hun eigen repo/contract.
- `website-qa-checklist` accepteert onafhankelijke QA; `Yolol100/Checklist` is rollback-only. Geen klantdata, screenshots of taakgebonden manifestkopieen op `main`.

## WordPress QA

- Het live Project Checklist-manifest is bronwaarheid; de geinstalleerde Skill heeft een apart SHA-manifest. Vergelijk **alle actieve bronhashes** voor een syncclaim. Verschillen eerst gecontroleerd reconciliëren met back-up, readback en regressietests; versienummers hoeven niet identiek te zijn.
- Selecteer alleen wat van toepassing is: `WPQ-S` website/klantreis/CRO; `WPQ-W` webshop/kooproute; `WPQ-P` plugin UX/lifecycle; `WPQ-T` thema/editor/TH-01..16. Een webshop krijgt ook de sitejourney; een los ZIP of admin-only plugin krijgt geen fictieve publieke browser-/checkout-PASS.
- Een expliciete audit mag zonder codewijziging. Selectie en een ingevuld reviewregister zijn **planning**, geen runtime-, conversie- of WCAG-Go.
- Een complete review vereist bewijs voor dezelfde website/subsite, omgeving, artifactversie en geldig tijdstip. Helemaal N/A is geen completering; checkout en betaling vereisen passende echte runtime-/sandboxobservaties. Test alleen de geraakte scopes en houd uitgestelde site-evidence apart van een source-only plugin/thema. De Skill-verifier toetst ook de exact gedownloade ZIP-SHA tegen het live manifest.

## Uitvoering en veiligheid

- Gebruik de werkelijk beschikbare capability. Voor Design-owned GitHub-commands: `requests/command.json` op tijdelijke `runtime/**` branch; GitHub Actions publiceert `results/` als **run-scoped artifact**, nooit als commit op `main`. Controleer request-ID, head-SHA, omgeving en artifact voor elke claim; cleanup ruimt alleen tijdelijke runtimebranches op.
- Verouderde bron: lees live opnieuw. Ontbrekende optionele tool: alternatief bewijs of alleen die test `blocked`/`not_run`. Verkeerde owner, manifest of niet-ready command: herstel die route, niet de hele workflow. Ongewijzigd target is geen reden om een expliciete audit over te slaan.
- Behoud echte poorten: toestemming, bronintegriteit, autorisatie, preflight, rollback, hoog/kritiek defect en verplicht runtimebewijs. Geen ongeautoriseerde live writes, fictieve PASS of globale omzeiling van een blocker.
