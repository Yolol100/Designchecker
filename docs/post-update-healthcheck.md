# Post-update website healthcheck

Designchecker can run the same read-only post-update healthcheck locally or through GitHub Actions.

## What it checks

A target is `FAIL` on decisive homepage failures such as HTTP 5xx/404, navigation failure, a WordPress critical/database/maintenance error, or an unusable blank render.

A target is `WARNING` for non-decisive signals such as a WAF/bot barrier, browser console/page errors, or failing first-party subresources. These signals require review but do not automatically mean the website is offline.

The runner never submits forms or other write requests. The existing network guard allows only GET/HEAD and blocks private/local targets unless the repository's explicit local-test override is enabled.

## Local use

After dependencies and Chromium are installed:

```bash
npm ci
npm run setup:browsers
npm run healthcheck -- --target https://example.com
```

To consume the `summary.tsv` produced by the WordPress batch updater:

```bash
npm run healthcheck -- --summary /path/to/run/summary.tsv
```

The result is written to `results/healthcheck.json`. Screenshots are created only for `WARNING` and `FAIL` targets.

## GitHub Actions

`.github/workflows/post-update-healthcheck.yml` supports:

- `workflow_dispatch` with `targets_json`;
- `repository_dispatch` with event type `wordpress_post_update_healthcheck` and `client_payload.targets`.

Example payload shape:

```json
{
  "event_type": "wordpress_post_update_healthcheck",
  "client_payload": {
    "targets": [
      {"domain": "example.com", "updateStatus": "PASS"},
      "https://shop.example.com/"
    ]
  }
}
```

The workflow accepts at most 150 targets, runs four browser checks concurrently, uploads the run-scoped JSON/screenshots for seven days, and fails only when one or more sites have a definitive `FAIL` result.

Do not hard-code a GitHub token in a WordPress/Hostinger update script. If an external script triggers this workflow, use a narrowly scoped credential supplied through the runtime environment or another approved secret store.
