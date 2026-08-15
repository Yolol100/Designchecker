# Routingcontract

De repository is een capability-laag, geen tweede inhoudelijke eigenaar.

Vaste volgorde: `doel -> domain_owner -> live projectbron -> taakrelevante selector -> capability -> tool -> evidence`.

- `webactueel-workflow` bepaalt de eigenaar en beheert cross-skill routing.
- De canonieke Skill-router staat in `webactueel-workflow/references/skill-registry.json`.
- De canonieke projectbronrouter staat in `webactueel-workflow/references/project-source-registry.json`.
- `config/tool-routing.json` koppelt MCP-tools aan dezelfde owners, project-ID's en selector-ID's, maar kopieert geen projectinhoud of Drive-manifest.
- Een tool mag geen andere domain owner creëren. Gedeelde engines erven de primaire eigenaar van de route.
- Projectspecifiek werk vereist een live read van het geregistreerde Drive-manifest voordat projectclaims worden gedaan.
- Leads vereist eerst de persistente Lead Registry; deze repo kwalificeert of mailt nooit zelfstandig.
- Website QA blijft eigenaar van onafhankelijke runtime-GO/No-Go. Automatische scans alleen zijn nooit voldoende voor WCAG-, conversie-, ranking- of productieclaims.

## ChatGPT-trigger

De repository alleen installeert geen ChatGPT-plugin. Automatische toolselectie ontstaat pas wanneer de MCP-server als bereikbare custom MCP-capability op de actuele ChatGPT-surface is verbonden. De MCP-toolbeschrijvingen bevatten daarom owner- en bronvoorwaarden, terwijl `config/tool-routing.json` de machineleesbare controlelaag vormt.
