# Post-update website healthcheck

Designchecker provides one read-only post-update health engine for local use and a reusable GitHub Actions workflow.

## What it checks

A target is `FAIL` on decisive homepage failures such as HTTP 4xx/5xx, navigation failure, a WordPress critical/database/maintenance error, or an unusable blank render. A recognized WAF/bot barrier and HTTP 429 remain `WARNING` because they can block the synthetic runner while the public site is still healthy.

Browser/page errors and failing first-party GET/HEAD subresources are `WARNING`. Requests that Designchecker's own read-only network guard intentionally blocks are ignored, so forms or write requests cannot create false warnings.

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

## GitHub Actions and client privacy

`Yolol100/Designchecker` is public. Client domains, screenshots and health evidence must therefore **not** be submitted to a direct workflow run in this repository.

`.github/workflows/post-update-healthcheck.yml` is a reusable `workflow_call` capability. A private caller repository supplies `targets_json` and pins both the reusable workflow reference and `designchecker_ref` to an immutable Designchecker commit SHA. The run and uploaded artifacts then remain attached to the private caller workflow rather than becoming public Designchecker evidence.

Public pull-request runs use only the fixed `https://example.com` fixture to verify the reusable workflow itself.

A private caller can use:

```yaml
jobs:
  healthcheck:
    uses: Yolol100/Designchecker/.github/workflows/post-update-healthcheck.yml@<DESIGNCHECKER_SHA>
    with:
      targets_json: ${{ inputs.targets_json }}
      designchecker_ref: <DESIGNCHECKER_SHA>
```

If an external WordPress/Hostinger update script starts that private caller through GitHub's `workflow_dispatch` API, use a narrowly scoped credential supplied through the runtime environment or another approved secret store. For a fine-grained personal access token, the target private repository requires **Actions: write** for `workflow_dispatch`. Never hard-code the token in the update script.

The reusable workflow accepts at most 150 targets, defaults to four browser checks concurrently, uploads run-scoped JSON/screenshots for seven days and fails only when one or more sites have a definitive `FAIL` result.
