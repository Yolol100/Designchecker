# Direct ChatGPT Web command route

This is the default execution route for normal ChatGPT Web. It does not require MCP, a tunnel, an API key, or another vendor account. It uses the GitHub app already connected to ChatGPT and the repository's own GitHub Actions token.

## Contract

1. `webactueel-workflow` resolves goal -> domain owner -> registered live Google Drive manifest -> task-relevant selector -> capability.
2. ChatGPT reads the live Drive source through the existing connector and only emits a command with `source_context.integrity_status=verified` when owner, project ID and active source set are consistent.
3. For Leads, the Lead Registry preflight happens before any browser scan.
4. ChatGPT writes `requests/command.json` through the connected GitHub app.
5. The push to `main` automatically triggers `.github/workflows/command.yml`.
6. `scripts/run-command.mjs` revalidates owner, project, source freshness, required preconditions and command registry.
7. The selected target-read-only capability runs on a GitHub-hosted runner.
8. Evidence is committed to `results/<request_id>.json`; Lead formal browser screenshots go under `results/assets/<request_id>/`.
9. The owning Skill interprets evidence. Website QA independently owns integrated release acceptance where required.

## Commands

- Design: `design`, `a11y`.
- SEO: `seo`, `seo-technical`, `links`, `performance`, `html`.
- Elementor: `elementor`, `elementor-json`.
- Leads: `leads`, `lead-formal` (Registry-first; never sends email or submits forms).
- WordPress/Programmeren: `performance`, `html`.
- Website QA: `qa`, `a11y`, `links`, `performance`, `html`.

`seo-technical` replaces the old `Yolol100/seochecker` execution role. `lead-formal` replaces the old `Yolol100/Leadscanner` execution role. The legacy repositories are not required at runtime.

## Safety boundary

Commands are evidence-only and never modify the audited website. A command without a verified, current live-source context is rejected. Private/local web targets are blocked. Leads requires a verified Lead Registry preflight and performs GET/HEAD-only browser traffic; it never performs account enumeration, contact enrichment, form submission or email actions.
