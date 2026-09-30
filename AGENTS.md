# Designchecker repository instructions

## Scope
- This repository is a deterministic design evidence adapter for `design`; it is not a domain owner and never makes the final Design or QA decision.
- `webactueel-workflow` remains the controller for cross-skill routing, source selection, handoffs and total workflow closure.
- Prefer a native Work/Codex browser or Product Design capability when it can produce the same bounded evidence class without repository execution. Use this repository when persistent baselines, deterministic diffs or reproducible remote evidence are actually needed.

## Before changing files
- Read `README.md`, `package.json`, `runtime-contract.json` when present, and the relevant `.github/workflows/` files.
- Keep `main` generic. Concrete requests belong only on temporary `runtime/**` branches; run-specific results belong in Actions artifacts or ignored runtime output.
- Do not commit client data, credentials, private screenshots, generated result residue or project-source truth.

## Validation
Use the locked dependency graph for repository changes:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run check
npm run build
npm test
npm run smoke
```

Install Playwright browsers only when the changed path or test actually needs browser execution.

## Evidence boundaries
- axe-core signals do not prove WCAG conformance.
- Lighthouse is lab evidence, not field Core Web Vitals.
- Visual diffs prove bounded visual change, not design desirability.
- A successful repository run is controlled evidence only; `design` interprets design findings and `website-qa-checklist` owns independent release acceptance.
- Do not merge, publish or deploy merely because repository checks are green.

## Agent capability and impact policy

Before an agent changes repository or external state:

- Classify the intended action as `read_only`, `safe_write` or `high_risk_write`.
- `read_only` may inspect, search, diff, lint and test without mutating external state.
- `safe_write` must be bounded and reversible, with target preflight, stale-state/idempotency protection where relevant, exact readback and rollback when the target supports it.
- `high_risk_write` includes destructive, production, deploy, publish, permission, security-sensitive or broadly scoped mutations. Keep it behind an explicit owner/approval gate and stronger verification.
- Tool availability, an agent request or a green CI run never grants broader write permission.

Before non-trivial source changes, build a bounded impact context from the changed paths, their direct imports/dependencies, relevant contracts/workflows and the tests that prove the behavior. A generated graph or index is commit-bound evidence/cache only: do not treat it as project truth, durable memory or a second controller.

GitHub Trending and external repositories are discovery signals only. Extract patterns, then verify them against the repository's owner contract, current primary/official documentation and local regression evidence. Do not copy code, prompts, assets or configuration without compatible usage rights and an explicit repository-level reason.

