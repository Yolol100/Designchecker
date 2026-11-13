# Public Responsive QA

This is a deliberately separate, **read-only public website audit**. It does not consult or trust a Google Drive project manifest. In particular, a manifest configured with `anyone:writer` remains **untrusted as project authority**, even though a public website can still be checked safely.

## Execution

- Trigger: push one new `requests/public-responsive/<id>.json` on a temporary `runtime/**` branch.
- Targets: 1–30 public HTTPS pages on a single origin, no credentials, query parameters, private IPs or nonstandard ports.
- Evidence: Playwright Chromium responsive observations, overflow and image signals, console-error counts, axe-core samples and full-page screenshots.
- Guardrails: GET/HEAD-only requests, no WebSockets or service workers, DNS-pinned network proxy to exclude private/reserved IP addresses. **No forms are submitted.**
- Outputs: `audit.json`, `audit.csv` and screenshots under an ephemeral GitHub Actions artifact; 1-day artifact retention. The runtime branch is removed by the existing matching-head cleanup workflow.
- Public repository caveat: Action artifacts and temporary branches may be visible to everyone. Use only publicly visible site pages, and never put client credentials or private evidence in these requests or outputs.
- The repository `main` branch stores only reusable code and workflow definitions, never a site-specific request or its screenshots.

## Runtime request example

```json
{
  "schema_version": "public-responsive-qa/1",
  "request_id": "public-qa-001",
  "site": "https://example.com/",
  "targets": [{"slug":"home","url":"https://example.com/"}],
  "viewports": [
    {"name":"mobile-390","width":390,"height":844},
    {"name":"tablet-768","width":768,"height":1024},
    {"name":"desktop-1440","width":1440,"height":900}
  ],
  "screenshot_viewports": ["mobile-390","tablet-768","desktop-1440"],
  "axe_viewports": ["mobile-390","desktop-1440"]
}
```

The runner is an evidence adapter, not a formal Website QA certification, legal WCAG compliance assessment, or real-device test. Review per-URL, per-viewport observations before making any release claim.
