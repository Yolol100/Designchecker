# ChatGPT Web koppeling

## Primaire route: direct via GitHub

De standaardroute vereist geen custom MCP, tunnel, API-key of extra leveranciersaccount. ChatGPT gebruikt de bestaande GitHub- en Google Drive-koppelingen.

1. `webactueel-workflow` bepaalt doel en `domain_owner`.
2. ChatGPT leest het exact geregistreerde live Drive-manifest en alleen de taakrelevante bron/selectors.
3. Alleen bij geldige owner/project/manifest-koppeling en `integrity_status=verified` wordt een command opgebouwd.
4. ChatGPT schrijft `requests/command.json` naar `main` via de verbonden GitHub-app.
5. De push triggert automatisch `.github/workflows/command.yml`.
6. `scripts/run-command.mjs` controleert opnieuw commandstatus, projectbinding, exact manifest-ID, bronfreshness en preconditions.
7. GitHub Actions voert de target-read-only capability uit.
8. Het resultaat wordt als `results/<request_id>.json` teruggecommit.
9. De owning Skill interpreteert het bewijs; Website QA bezit onafhankelijke releaseacceptatie waar nodig.

`config/project-source-bindings.json` kan een heel project blokkeren wanneer bronintegriteit niet klopt. Een technisch gezonde runner is dus niet genoeg om een brononzuivere route toch uit te voeren.

## Geen extra installatie

Voor deze primaire route hoeft de gebruiker in ChatGPT Web niets extra's te installeren. De reeds verbonden GitHub-app is de commandtransportlaag; Google Drive levert projectwaarheid. De repository gebruikt voor deze route geen externe API-key.

## Veiligheid

- Doelsites worden niet gewijzigd.
- Alleen `http:`/`https:` publieke targets worden geaccepteerd.
- Localhost, private literal IP's en hostnames die naar geblokkeerde private/loopback ranges resolven worden standaard geweigerd.
- Broncontext ouder dan 24 uur wordt geweigerd.
- Leads vereist Lead Registry-preflight; geen account-enumeratie, formulieren, login of e-mailactie.
- `lead-formal` is geblokkeerd totdat het actuele Project Leads-provenancecontract exact wordt ondersteund.
- Project SEO is geblokkeerd zolang de live Drive manifest/checksumdrift openstaat.

## Optioneel MCP

`src/mcp/` blijft bestaan als optionele backwards-compatible interface voor andere surfaces. Het is niet nodig voor de normale ChatGPT-Web commandroute en hoeft niet te worden aangesloten.
