# Designchecker — Automated Website QA & Visual Regression

> **Portfolio project · read-only website analysis · TypeScript / Playwright**

Designchecker turns manual website QA into a repeatable evidence workflow. It captures browser behaviour, accessibility signals, performance measurements, markup validation and visual-regression results without making changes to the target website.

**Developer profile:** [Andrew Baeten](https://github.com/Yolol100) · [GitHub project index](https://github.com/Yolol100?tab=repositories)  
**Useful for:** WordPress teams, web agencies, QA workflows and developers who need reproducible website-quality evidence.

## What a website team can review

**Before a release:** a developer runs a read-only check against an authorized website. The tool can collect browser errors, visual differences, automated accessibility findings, Lighthouse lab measurements and HTML validation results. A person then reviews the evidence and decides which findings matter.

**What this means for a client:** fewer invisible surprises at handover and a repeatable way to discuss concrete defects instead of relying only on a quick visual glance. This is a **quality-review workflow**, not a promise of a particular Lighthouse score, WCAG certification or a perfect site.

**For a quick technical assessment:** inspect the [test suite](tests/), [Playwright/QA implementation](src/) and [continuous integration](.github/workflows/). To see actual website presentation work rather than private client QA data, browse my [public WordPress case studies](https://andrewbaeten.nl/category/cases/).

## Why this project matters

A website can look correct during a quick manual check while still containing browser, accessibility, performance or visual-regression problems. Designchecker combines several independent checks into one inspectable workflow so issues can be found consistently before release.

| Area | What it demonstrates |
| --- | --- |
| Browser QA | Playwright-based browser capture and runtime inspection |
| Accessibility | axe-core automated accessibility risk signals |
| Performance | Lighthouse lab measurements |
| Visual regression | Pixelmatch + Sharp screenshot comparison |
| Markup quality | Nu HTML Checker validation |
| Engineering quality | TypeScript, CI, contract tests, fixtures and bounded smoke checks |
| Safety | Read-only execution and temporary run-scoped input/output |

## What a website team gets

Instead of relying on a last-minute visual check, a release reviewer can run the same categories of checks repeatedly and inspect the evidence behind a decision.

| Question before launch | Evidence to inspect |
| --- | --- |
| Does the page behave correctly in a browser? | Playwright checks and captured browser state |
| Did a layout unexpectedly change? | Screenshot comparisons, with human review of intended changes |
| Are there detectable accessibility risks? | Automated axe-core findings, followed by manual testing |
| Is there a performance concern? | Lighthouse **lab** measurements, not a promise about real visitors |
| Is HTML markup valid? | Nu HTML Checker results |

**How to review it:** [Run the checks locally](#quick-technical-review), inspect the [TypeScript engines](src/), then compare the [regression tests](tests/) against their implementation. The current CI results are visible in [GitHub Actions](https://github.com/Yolol100/Designchecker/actions).

**Privacy and honesty:** This repository deliberately does **not** contain client screenshots or run artifacts. A real client QA result needs permission and a separate review; no example image here is presented as a successful live-site audit.

## Quick code-review route

For a short technical review, see the [QA engines](src/), [regression tests](tests/), [CI workflows](.github/workflows/) and [toolkit contract](toolkit-contract.json). These are reusable source and verification paths; client-specific findings and screenshots remain outside the public default branch.

## Optionele AI-ondersteunde QA-triage (pilot)

De [AI-ondersteunde triageprocedure](docs/AI-ASSISTED-QA-TRIAGE.md) beschrijft hoe een reviewer hypotheses kan laten formuleren over bestaande QA-fouten. Dit is uitsluitend een voorstel voor een afgebakende pilot met gesaniteerde fixtures: geen nieuwe CI-feature, geen automatische bugfix, geen WCAG-certificering en geen Go/No-Go.

## Quick technical review

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run setup:browsers
npm run build
npm test
npm run smoke
python3 scripts/validate_toolkit_contract.py
```

The default branch contains reusable capability, validators, fixtures and regression tests. Project-specific targets, screenshots and run evidence stay temporary and are not committed to `main`.

## Architecture

```text
request → Designchecker engines
             ↓
      run-scoped evidence
             ↓
      review / QA decision
```

In the wider Webactueel workflow, specialist logic remains outside this repository. Designchecker is the execution/evidence layer rather than the final decision-maker.

## Internal integration contract

The registered Webactueel route remains:

```text
request → webactueel-workflow → domain owner → live Drive source → evidence need → Designchecker → GitHub Actions → run-scoped artifact → owning skill
```

Designchecker is only an execution/evidence capability. It does not become a second domain owner and does not independently issue the final Go/No-Go decision.

## Repository hygiene

- Concrete `requests/command.json` state exists only temporarily on a `runtime/**` branch.
- Request inputs for a concrete assignment remain on that temporary branch or in run artifacts.
- `results/` is runtime output, is ignored by Git and is published only as a GitHub Actions artifact.
- Screenshots, dated runs, target data and project-specific evidence are not committed to `main`.

## Engines

- **Playwright** — browser capture and DOM/runtime inspection.
- **axe-core** — automated accessibility risk signals.
- **Lighthouse** — performance and quality lab measurements.
- **Pixelmatch + Sharp** — screenshot and visual-regression comparison.
- **Nu HTML Checker** — markup validation.
- **Native fetch / Python / Node** — bounded technical inspection where appropriate.

## Evidence boundaries

Automated tools provide signals and reproducible evidence, not guarantees. axe-core does not prove complete WCAG conformance, Lighthouse is lab data, and a visual diff cannot decide whether a design change is desirable. Final release decisions still require human and context-aware review.

## Project status and support

Designchecker is actively developed as a reusable QA evidence layer. Report reproducible technical defects through [GitHub Issues](https://github.com/Yolol100/Designchecker/issues) without publishing client targets or private run evidence.

## About the developer

I am **Andrew Baeten**, a WordPress Developer & Web Designer with **10 years of WordPress experience**, **90 delivered projects** and ongoing management of **120 websites and webshops**. My work spans WordPress, WooCommerce, Elementor, ACF, UX, performance, accessibility and automated QA.

[GitHub project index](https://github.com/Yolol100?tab=repositories) · [LinkedIn](https://www.linkedin.com/in/andrew-baeten-305a1478/) · [Email](mailto:info@andrewbaeten.nl)

## License

This repository currently has no open-source license. Reuse, distribution or derivative works are not permitted without explicit permission from the copyright holder.
