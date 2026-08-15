# Direct ChatGPT Web command route

Default route for normal ChatGPT Web. It does not require an MCP server, tunnel, API key, or a second vendor account.

## Contract

1. ChatGPT resolves `goal -> owner -> live Drive manifest -> selector -> capability` using the installed Webactueel Skills.
2. ChatGPT writes `requests/command.json` through the already connected GitHub app.
3. The push to `main` automatically triggers `.github/workflows/command.yml`.
4. The workflow validates owner/project/source context against `config/tool-routing.json`.
5. The selected read-only capability runs on a GitHub-hosted runner.
6. Evidence is committed to `results/<request_id>.json`.
7. ChatGPT reads the workflow/result and continues the owning Skill or Website QA flow.

## Supported commands

- `design`, `seo`, `elementor`, `leads`, `qa`
- `a11y` with owner `design` or `website-qa-checklist`
- `links` with owner `seo` or `website-qa-checklist`
- `performance` with owner `seo`, `wordpressqualityarchitect`, or `website-qa-checklist`
- `html` with owner `seo`, `wordpressqualityarchitect`, or `website-qa-checklist`

The runner is evidence-only. It does not modify the audited website. Project truth remains in the registered live Google Drive manifest; a command without `source_context` is rejected.
