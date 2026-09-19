import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { VISUAL_READINESS_POLICY } from '../src/core/browser.js';

test('visual readiness policy avoids networkidle and waits for stable visual prerequisites', async () => {
  assert.deepEqual(VISUAL_READINESS_POLICY, {
    navigation: 'domcontentloaded',
    body: 'visible',
    load: 'best-effort',
    fonts: 'ready',
    animationFrames: 2
  });

  const [browserSource, designSource] = await Promise.all([
    fs.readFile(path.resolve(process.cwd(), 'src/core/browser.ts'), 'utf8'),
    fs.readFile(path.resolve(process.cwd(), 'src/tools/design.ts'), 'utf8')
  ]);

  assert.equal(browserSource.includes("waitUntil: 'networkidle'"), false);
  assert.equal(designSource.includes("waitUntil: 'networkidle'"), false);
  assert.match(browserSource, /waitUntil: 'domcontentloaded'/);
  assert.match(browserSource, /locator\('body'\)\.waitFor/);
  assert.match(browserSource, /fonts\.ready/);
  assert.match(designSource, /navigateReadOnlyPage/);
});
