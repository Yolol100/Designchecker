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

### WordPress-productprofielen als QA-selectie (geen runtimewijziging)

- De live `project-checklist`-bron `support/92-wordpress-deliverable-quality-profiles.md` laat de Website-QA-Skill vier optionele scenariofamilies selecteren: `WPQ-S` (website/journey/CRO), `WPQ-W` (webshop/aankoop), `WPQ-P` (plugin UX/lifecycle) en `WPQ-T` (theme content/journey). Een webshop activeert tevens de websitejourney; plugin- en themabroncode zonder aangetoonde gewijzigde siteflow activeert geen browser-GO.
- Dit zijn **alleen** Checklist-evidenceankers, geen nieuwe controller-`change_type`-ID's, Designchecker-commando's, Design-owned source bindings of extra repositorybeleid. `webactueel-workflow` en de eigenaren behouden bestaande uitvoering en acceptatie; de harness levert uitsluitend expliciet aangevraagd read-only browserbewijs.

- Een expliciet gevraagde audit selecteert alle toepasselijke kwaliteitsgebieden ook zonder voorafgaande codewijziging; de profielselector is planning, geen browser-Go of formele WCAG-/conversieclaim.

## ChatGPT-trigger

Selecteer de werkelijk beschikbare capability; MCP is optioneel, geen verplichte route of standaardverbod. Voor een Design-owned direct command kan de bestaande GitHub-app na live bronverificatie `requests/command.json` op een tijdelijke `runtime/**`-branch schrijven. GitHub Actions voert read-only uit en levert `results/` als **run-scoped workflow-artifact**, niet als commit op `main`. Lees artifact, request-ID, head-SHA en omgeving terug vóór een claim. De bestaande cleanupworkflow verwijdert alleen afgeronde tijdelijke runtimebranches.

## Harde poorten en herstel

- Verkeerd owner/project/manifest-ID: blokkeer alleen de betreffende route en verifieer de correcte geregistreerde bron.
- Niet-geverifieerde of verouderde broncontext: lees de live bron opnieuw; een oude cache is geen definitieve projectblokkade.
- Projectbinding `execution_status != ready` of commandroute `status != ready`: voer **die route** pas uit nadat de geregistreerde blocker is opgelost.
- Ontbrekende optionele tool, browser of scope-evidence: kies een beschikbare, gelijkwaardige read-only route; blijft het nodig, zet de **getroffen test** op `blocked`/`not_run`, niet het hele rapport op fictieve PASS.
- Een expliciet aangevraagde audit mag ook zonder codewijziging plaatsvinden; `not_required` voor browser-QA bij een bron-/ZIP-only wijziging is geen vrijstelling van bron-, plugin- of thema-audits.
- Toegangsweigering, ontbrekende toestemming/rollback voor risicowrites, open hoog/kritiek defect en ontbrekend verplicht runtimebewijs blijven echte stopvoorwaarden; haal deze poorten niet weg.
- Leads-Registry en formele Leads-provenance gelden alleen voor Leads-routes, niet als preflight voor Designchecker of Website QA.
