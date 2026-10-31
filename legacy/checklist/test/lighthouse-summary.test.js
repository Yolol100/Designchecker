import test from "node:test";
import assert from "node:assert/strict";
import { summarizeLighthouseRuns } from "../src/lighthouse-summary.js";

const makeReport = (formFactor, score, lcp, cls, fcp, tbt) => ({
  lighthouseVersion: "13.4.1",
  configSettings: { formFactor },
  categories: { performance: { score } },
  audits: {
    "largest-contentful-paint": { numericValue: lcp },
    "cumulative-layout-shift": { numericValue: cls },
    "first-contentful-paint": { numericValue: fcp },
    "total-blocking-time": { numericValue: tbt },
  },
});

const reports = (profile) => [
  makeReport(profile, .95, 1200, .03, 500, 20),
  makeReport(profile, .90, 1800, .01, 700, 60),
  makeReport(profile, .98, 1000, .02, 400, 10),
];

test("uses all three runs and reports median and spread for each metric", () => {
  const result = summarizeLighthouseRuns(reports("mobile"), "mobile");
  assert.equal(result.sample_count, 3);
  assert.deepEqual(result.metrics.lcp_ms, { median: 1200, minimum: 1000, maximum: 1800, spread: 800 });
  assert.deepEqual(result.metrics.cls, { median: .02, minimum: .01, maximum: .03, spread: .02 });
  assert.equal(result.metrics.fcp_ms.median, 500);
  assert.equal(result.metrics.tbt_ms.spread, 50);
  assert.equal(result.metrics.performance_score.median, .95);
  assert.equal(result.production_cwv_certified, false);
});

test("desktop and mobile remain separate", () => {
  const desktop = summarizeLighthouseRuns(reports("desktop"), "desktop");
  assert.equal(desktop.profile, "desktop");
  assert.throws(() => summarizeLighthouseRuns(reports("desktop"), "mobile"), /mismatched/);
});

test("rejects one or two-run old evidence", () => {
  assert.throws(() => summarizeLighthouseRuns(reports("mobile").slice(0, 1), "mobile"), /exactly 3/);
  assert.throws(() => summarizeLighthouseRuns(reports("mobile").slice(0, 2), "mobile"), /exactly 3/);
});

test("rejects missing numeric metrics and run errors", () => {
  const missing = reports("mobile");
  delete missing[1].audits["total-blocking-time"];
  assert.throws(() => summarizeLighthouseRuns(missing, "mobile"), /invalid tbt/);
  const broken = reports("mobile");
  broken[1].runtimeError = { code: "NO_FCP" };
  assert.throws(() => summarizeLighthouseRuns(broken, "mobile"), /runtime error/);
});

test("rejects false or inconsistent Lighthouse versions", () => {
  const inconsistent = reports("mobile");
  inconsistent[1].lighthouseVersion = "13.1.0";
  assert.throws(() => summarizeLighthouseRuns(inconsistent, "mobile"), /versions/);
  const missing = reports("mobile");
  delete missing[0].lighthouseVersion;
  assert.throws(() => summarizeLighthouseRuns(missing, "mobile"), /versions/);
});

test("rejects NaN, negative and out-of-range performance scores", () => {
  for (const score of [Number.NaN, -1, 1.2]) {
    const invalid = reports("mobile");
    invalid[1].categories.performance.score = score;
    assert.throws(() => summarizeLighthouseRuns(invalid, "mobile"), /invalid performance_score|score must/);
  }
});


test("full runtime workflow collects both independent three-run profiles", async () => {
  const fs = await import("node:fs/promises");
  const workflow = await fs.readFile(
    new URL("../../../.github/workflows/run-website-qa.yml", import.meta.url), "utf8");
  const merger = await fs.readFile(
    new URL("../src/append-supplemental.js", import.meta.url), "utf8");
  const runner = await fs.readFile(
    new URL("../../../scripts/run-lighthouse-six.sh", import.meta.url), "utf8");
  assert.match(workflow, /bash scripts\/run-lighthouse-six\.sh/);
  assert.match(workflow, /npm audit --audit-level=high/);
  assert.match(runner, /for profile in desktop mobile/);
  assert.match(runner, /for index in 1 2 3/);
  assert.match(runner, /--preset=desktop/);
  assert.match(runner, /\.lighthouseci-desktop/);
  assert.match(runner, /\.lighthouseci/);
  assert.match(runner, /summarizeLighthouseRuns\(reports, profile\)/);
  assert.match(merger, /summarizeLighthouseRuns\(reports, profile\)/);
  assert.match(merger, /Lighthouse requires BOTH mobile and desktop run evidence/);
  assert.doesNotMatch(workflow, /lhci collect|--numberOfRuns=1/);
});
