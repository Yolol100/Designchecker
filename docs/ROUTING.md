# Routingcontract

De repository is een capability- en uitvoerlaag, geen tweede inhoudelijke eigenaar.

Vaste volgorde: `doel -> domain_owner -> live projectbron -> taakrelevante selector -> capability -> tool -> evidence`.

- `webactueel-workflow` bepaalt de eigenaar en beheert cross-skill routing.
- Skills bevatten herbruikbare methode; geregistreerde Drive-manifesten bevatten projectwaarheid.
- `config/project-source-bindings.json` bindt uitsluitend Design-commando's aan het geregistreerde live Project Design-manifest. De controller leest voor andere vakskills en Website QA hun eigen projectmanifests; deze repo spiegelt die bronnen niet.
- `config/direct-command-registry.json` bepaalt command, owner, project, capability, preconditions en evidence-scope voor ChatGPT Web.
- `config/tool-routing.json` koppelt de gedeelde meettools aan dezelfde owners en selectorfamilies.
- Een tool creëert nooit een tweede domain owner. Gedeelde engines erven de primaire route-owner.
- Leads vereist eerst de persistente Lead Registry; supportbewijs is geen formele kwalificatie.
- Website QA blijft eigenaar van onafhankelijke runtime-GO/No-Go.

## Website QA: bron- en Skill-integriteit

- `website-qa-checklist` blijft de onafhankelijke acceptatie-eigenaar; het **live** `project-checklist/PROJECT-MANIFEST.json` bepaalt de actieve bronnen en hun SHA-256, terwijl de geïnstalleerde Skill-versie zijn eigen pakketmanifest (`references/source-manifest.json`) heeft.
- Voor bron-/Skill-synchronisatie vergelijkt `webactueel-workflow` de ruwe SHA-256 van **elke actieve** `active/<bestandsnaam>` met de corresponderende actuele `references/<bestandsnaam>` van de Skill, inclusief bronrouter en specialist-completion. Project- en Skill-versies zijn aparte reeksen en mogen niet blind op stringgelijkheid worden beoordeeld.
- Een afwijking blokkeert een volledige synchronisatie- of releaseclaim totdat de betrokken eigenaar de wijziging met back-up, readback en regressietests heeft gereconcilieerd. Designchecker blijft uitsluitend read-only bewijsuitvoerder: geen gekopieerde QA-beleidsbestanden, klantdata of vastgepinde projecthashes in deze repo.
- `Yolol100/Checklist` is alleen de legacy rollbackroute; nieuwe QA-features en de actieve browser-evidenceroute horen daar niet thuis.

## ChatGPT-trigger

Normale ChatGPT Web gebruikt standaard geen MCP. Na live bronverificatie schrijft ChatGPT `requests/command.json` via de bestaande GitHub-app. GitHub Actions voert het command uit en commit evidence terug naar `results/`. MCP blijft alleen een optionele backwards-compatible interface.

## Harde poorten

- verkeerd owner/project/manifest-ID -> blokkeren;
- niet-geverifieerde of >24 uur oude broncontext -> blokkeren;
- projectbinding met `execution_status != ready` -> blokkeren;
- commandroute met `status != ready` -> blokkeren;
- Leads zonder Registry-preflight -> blokkeren;
- formele Leads zonder actueel provenancecontract -> blokkeren.
