# Routingcontract

De repository is een capability- en uitvoerlaag, geen tweede inhoudelijke eigenaar.

Vaste volgorde: `doel -> domain_owner -> live projectbron -> taakrelevante selector -> capability -> tool -> evidence`.

- `webactueel-workflow` bepaalt de eigenaar en beheert cross-skill routing.
- Skills bevatten herbruikbare methode; geregistreerde Drive-manifesten bevatten projectwaarheid.
- `config/project-source-bindings.json` bindt elk project aan één exact live manifest-ID en blokkeert uitvoering bij open bronintegriteitsconflict.
- `config/direct-command-registry.json` bepaalt command, owner, project, capability, preconditions en evidence-scope voor ChatGPT Web.
- `config/tool-routing.json` koppelt de gedeelde meettools aan dezelfde owners en selectorfamilies.
- Een tool creëert nooit een tweede domain owner. Gedeelde engines erven de primaire route-owner.
- Leads vereist eerst de persistente Lead Registry; supportbewijs is geen formele kwalificatie.
- Website QA blijft eigenaar van onafhankelijke runtime-GO/No-Go.

## ChatGPT-trigger

Normale ChatGPT Web gebruikt standaard geen MCP. Na live bronverificatie schrijft ChatGPT `requests/command.json` via de bestaande GitHub-app. GitHub Actions voert het command uit en commit evidence terug naar `results/`. MCP blijft alleen een optionele backwards-compatible interface.

## Harde poorten

- verkeerd owner/project/manifest-ID -> blokkeren;
- niet-geverifieerde of >24 uur oude broncontext -> blokkeren;
- projectbinding met `execution_status != ready` -> blokkeren;
- commandroute met `status != ready` -> blokkeren;
- Leads zonder Registry-preflight -> blokkeren;
- formele Leads zonder actueel provenancecontract -> blokkeren.
