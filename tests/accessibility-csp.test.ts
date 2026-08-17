import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const browserSource = readFileSync(path.join(process.cwd(), 'src/core/browser.ts'), 'utf8');
const accessibilitySource = readFileSync(path.join(process.cwd(), 'src/tools/accessibility.ts'), 'utf8');

test('CSP bypass remains opt-in and accessibility-scoped', () => {
  assert.match(browserSource, /bypassCSP:\s*options\.bypassCSP\s*\?\?\s*false/);
  assert.match(accessibilitySource, /withPage\(target,\s*\{\s*bypassCSP:\s*true\s*\}/);
  assert.match(accessibilitySource, /CSP is bypassed only inside the isolated accessibility browser context/);
});
