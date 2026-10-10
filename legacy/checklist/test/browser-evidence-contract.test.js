import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const browser = fs.readFileSync("src/browser.js", "utf8");

test("scenario signals extend rather than replace rich browser evidence", () => {
  assert.match(browser, /body-visible \+ mutation-quiescence/);
  assert.match(browser, /navigation_timing/);
  assert.match(browser, /inventory/);
  assert.match(browser, /internal_links/);
  assert.match(browser, /scenario_signals:\s*scenarios/);
  assert.match(browser, /passes:\s*axeFull\.passes\.length/);
  assert.match(browser, /incomplete:\s*axeFull\.incomplete\.length/);
  assert.match(browser, /inapplicable:\s*axeFull\.inapplicable\.length/);
  assert.match(browser, /writeJsonArtifact\(artifactRoot,\s*domRelative,\s*\{\s*readiness,\s*dom,\s*scenarios\s*\}\)/);
  assert.match(browser, /describeArtifact\(artifactRoot,\s*axeRelative/);
  assert.match(browser, /describeArtifact\(artifactRoot,\s*domRelative/);
});

test("persisted browser screenshots use deterministic Playwright settings", () => {
  assert.match(browser, /screenshotStability/);
  assert.match(browser, /animations:\s*"disabled"/);
  assert.match(browser, /caret:\s*"hide"/);
  assert.match(browser, /scale:\s*"css"/);
  assert.match(browser, /page\.screenshot\(\{[^}]*\.\.\.BROWSER_CONFIG\.screenshotStability/);
});

test("missing canonical never becomes a synthetic /null URL", () => {
  const match = browser.match(/const safeUrl = \(value\) => \{[\s\S]*?\n      \};/);
  assert.ok(match, "inline browser URL sanitizer not found");
  const script = new vm.Script(`(() => {
    const location = { href: "https://shop.example.test/winkel/" };
    ${match[0]}
    return [safeUrl(null), safeUrl(undefined), safeUrl(""), safeUrl("   "), safeUrl("https://shop.example.test/products/?ref=foo#section")];
  })()`);
  const actual = script.runInNewContext({ URL }, { timeout: 1000 });
  assert.deepEqual(Array.from(actual), [null, null, null, null, "https://shop.example.test/products/"]);
});

test("navigation observations are count-only, privacy safe and tied to rendered DOM", () => {
  const checklist = fs.readFileSync("src/checklist.js", "utf8");
  assert.match(browser, /navigation_structure: \\{/);
  for (const key of ["header_count", "footer_count", "navigation_count", "navigation_link_count", "header_navigation_link_count", "footer_navigation_link_count", "site_title_link_count"]) {
    assert.match(browser, new RegExp(key + ": document\\.querySelectorAll\\("));
  }
  assert.match(checklist, /navigation_structure: renderedDom\\?\\.navigation_structure \\|\\| null/);
  assert.doesNotMatch(checklist, /navigation_structure: .*innerHTML/);
});
