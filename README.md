# Designchecker — Automated Website QA & Visual Regression

> **Portfolio flagship · read-only website analysis · TypeScript / Playwright**

Designchecker turns manual website QA into a repeatable evidence workflow. It captures browser behaviour, accessibility signals, performance measurements, markup validation and visual-regression results without making changes to the target website.

**Built by:** [Andrew Baeten](https://github.com/Yolol100) · [Portfolio](https://andrewbaeten.nl)  
**Useful for:** WordPress teams, web agencies, QA workflows and developers who need reproducible website-quality evidence.

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

## Quick technical review

```bash
npm install
npm run setup:browsers
npm run build
npm test
npm run smoke
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

I am **Andrew Baeten**, a Senior WordPress Developer & Web Designer with 10+ years of experience across 70+ WordPress projects. I work across WordPress, WooCommerce, Elementor, ACF, UX, performance, accessibility and automated QA.

[Portfolio](https://andrewbaeten.nl) · [LinkedIn](https://www.linkedin.com/in/andrew-baeten-305a1478/) · [Email](mailto:info@andrewbaeten.nl)

## License

This repository currently has no open-source license. Reuse, distribution or derivative works are not permitted without explicit permission from the copyright holder.
