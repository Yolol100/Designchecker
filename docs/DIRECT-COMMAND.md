# Direct ChatGPT Web command route

This is the default execution route for normal ChatGPT Web in Designchecker. It does not require MCP, a tunnel, an API key, or another vendor account. It uses the GitHub app already connected to ChatGPT and the repository's own GitHub Actions token.

## Contract

1. `webactueel-workflow` resolves goal -> domain owner -> registered live Google Drive manifest -> task-relevant selector -> capability.
2. ChatGPT reads the live Drive source through the existing connector and only emits a command with `source_context.integrity_status=verified` when owner, project ID and active source set are consistent.
3. The runner requires the exact registered manifest ID from `config/project-source-bindings.json`; an arbitrary file cannot impersonate project truth.
4. For Leads, the Lead Registry preflight happens before any browser-support command.
5. ChatGPT writes `requests/command.json` through the connected GitHub app.
6. The push to `main` automatically triggers `.github/workflows/command.yml`.
7. `scripts/run-command.mjs` revalidates owner, project, source freshness, exact manifest identity, required preconditions and command registry.
8. The selected target-read-only capability runs on a GitHub-hosted runner. Browserless commands do not install Chromium.
9. Evidence is committed to `results/<request_id>.json`.
10. The owning Skill interprets evidence. Website QA independently owns integrated release acceptance where required.

## Ready commands

- Design: `design`, `a11y`.
- SEO: `seo`, `seo-technical`, `links`, `performance`, `html`.
- Elementor: `elementor`, `elementor-json`.
- Leads support only: `leads` after verified Registry preflight. This is not formal qualification evidence.
- WordPress/Programmeren evidence: `performance`, `html`; `wordpressqualityarchitect` remains the code/release owner.
- Website QA evidence: `qa`, `a11y`, `links`, `performance`, `html`; Website QA remains the acceptance owner.

## Leads exception

`lead-formal` is intentionally blocked. The installed Leads Skill and Project Leads 10.5.0 require repository identity `Yolol100/Leadscanner`, workflow/provenance rules and `webactueel-leadscanner-handoff/1.1`. Designchecker must not fake that provenance. Formal Leads qualification therefore keeps using the existing Leadscanner capability until the Leads Skill contract itself is intentionally updated, revalidated and installed. No extra MCP/API key is introduced by Designchecker.

## Safety boundary

Commands are evidence-only and never modify the audited website. A command without a verified, current live-source context is rejected. Private/local literal targets and hostnames resolving to blocked network ranges are rejected. Leads support commands never perform account enumeration, contact enrichment, form submission or email actions.
