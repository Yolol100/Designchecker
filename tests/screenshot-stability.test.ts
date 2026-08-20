import assert from 'node:assert/strict';
import test from 'node:test';
import { STABLE_SCREENSHOT_OPTIONS } from '../src/core/screenshot.js';

test('visual baselines use deterministic Playwright screenshot settings', () => {
  assert.deepEqual(STABLE_SCREENSHOT_OPTIONS, {
    animations: 'disabled',
    caret: 'hide',
    scale: 'css'
  });
});
