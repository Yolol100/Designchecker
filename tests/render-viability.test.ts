import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyRenderedPageViability } from '../src/core/browser.js';

test('blank rendered shell is not viable prospect design evidence', () => {
  const result = classifyRenderedPageViability({
    normalizedTextLength: 0,
    visibleInteractiveCount: 0,
    visibleMediaCount: 0,
    visibleLandmarkCount: 0
  });
  assert.equal(result.usable, false);
  assert.equal(result.reason, 'insufficient_rendered_content');
});

test('meaningful rendered text is viable', () => {
  const result = classifyRenderedPageViability({
    normalizedTextLength: 120,
    visibleInteractiveCount: 0,
    visibleMediaCount: 0,
    visibleLandmarkCount: 1
  });
  assert.equal(result.usable, true);
});

test('interactive control can make a low-text render viable', () => {
  const result = classifyRenderedPageViability({
    normalizedTextLength: 8,
    visibleInteractiveCount: 1,
    visibleMediaCount: 0,
    visibleLandmarkCount: 0
  });
  assert.equal(result.usable, true);
});

test('visual media can make a low-text render viable', () => {
  const result = classifyRenderedPageViability({
    normalizedTextLength: 0,
    visibleInteractiveCount: 0,
    visibleMediaCount: 1,
    visibleLandmarkCount: 0
  });
  assert.equal(result.usable, true);
});
