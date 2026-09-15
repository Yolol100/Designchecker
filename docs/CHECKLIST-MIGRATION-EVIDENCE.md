# Checklist migration evidence

Migration target: `Yolol100/Designchecker`.

Frozen compatibility source: `Yolol100/Checklist@25bf9fd8ccefdd06cb4e7adf36e3ab332c76b854`.

## Parity acceptance

Designchecker PR #27 (`Complete Checklist migration parity in Designchecker`) is merged. On exact migration head `96dc86f55e690e8818820d620aee000b9c2568c9`, the required workflows completed successfully:

- `ci` — run `34377479556`;
- `Checklist migration parity` — run `34377479611`;
- `Toolkit Contract` — run `34377479797`.

The merged runtime contains the immutable Website QA request runner, formal Evidence Manifest finalizer, frozen compatibility source and GET/HEAD-only browser-network hardening.

## Controller cutover

Live `Yolol100/Orchestrator` now registers adapter `checklist` on `Yolol100/Designchecker` using `.github/workflows/run-website-qa.yml`. This proves the transport cutover has occurred; repository success remains evidence only and `website-qa-checklist` still owns QA acceptance and release decisions.

## Remaining archive gate

`Yolol100/Checklist` remains rollback-only during the documented regression period. Do not archive it until the central controller registry/package is synchronized to the Designchecker route, that controller package is revalidated, the regression window completes without evidence regression, and the portfolio tracker records archive readiness.
