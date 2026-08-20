import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import { STABLE_SCREENSHOT_OPTIONS } from '../src/core/screenshot.js';
import { compareScreenshots, VISUAL_DIFF_POLICY } from '../src/tools/visual.js';

test('visual baselines use deterministic Playwright screenshot settings', () => {
  assert.deepEqual(STABLE_SCREENSHOT_OPTIONS, {
    animations: 'disabled',
    caret: 'hide',
    scale: 'css'
  });
});

test('visual diff evidence records the exact comparison policy', async () => {
  assert.deepEqual(VISUAL_DIFF_POLICY, { algorithm: 'pixelmatch', threshold: 0.1 });
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'designchecker-visual-'));
  const before = path.join(dir, 'before.png');
  const after = path.join(dir, 'after.png');
  const diff = path.join(dir, 'diff.png');
  try {
    await sharp({ create: { width: 2, height: 2, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } }).png().toFile(before);
    await sharp({ create: { width: 2, height: 2, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } }).png().toFile(after);
    const result = await compareScreenshots(before, after, diff);
    assert.deepEqual(result.data.comparisonPolicy, VISUAL_DIFF_POLICY);
    assert.equal(result.data.changedPixels, 0);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
