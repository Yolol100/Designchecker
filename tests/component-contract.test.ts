import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessCarouselContract,
  assessClickOnlyMenu,
  assessResponsiveOverflow
} from '../src/core/component-contract.js';

const twoUp = {
  totalItems: 4, fullyVisibleItems: 2, scrollWidth: 2370, clientWidth: 1180, navigationControlCount: 2
};

test('two visible cards and manual navigation satisfy explicit carousel contract', () => {
  const result = assessCarouselContract(
    { expectedVisibleItems: 2, minimumItems: 4 },
    twoUp,
    { nextMoved: true, keyboardMoved: true }
  );
  assert.equal(result.status, 'passed');
  assert.deepEqual(result.failures, []);
});

test('static 2x2 grid fails a two-up carousel contract', () => {
  const result = assessCarouselContract(
    { expectedVisibleItems: 2, minimumItems: 4 },
    { totalItems: 4, fullyVisibleItems: 4, scrollWidth: 1180, clientWidth: 1180, navigationControlCount: 0 },
    { nextMoved: false, keyboardMoved: false }
  );
  assert.equal(result.status, 'failed');
  assert.ok(result.failures.includes('not_horizontally_scrollable'));
  assert.ok(result.failures.includes('missing_navigation_controls'));
});

test('one oversized card fails the two-up visual contract', () => {
  const result = assessCarouselContract(
    { expectedVisibleItems: 2, minimumItems: 4 },
    { ...twoUp, fullyVisibleItems: 1 },
    { nextMoved: true, keyboardMoved: true }
  );
  assert.ok(result.failures.includes('wrong_visible_item_count'));
});

test('correct geometry without actual interaction evidence is not a pass', () => {
  const result = assessCarouselContract({ expectedVisibleItems: 2, minimumItems: 4 }, twoUp);
  assert.equal(result.status, 'needs_interaction_test');
});

test('non-functional click control and keyboard navigation are failures', () => {
  const result = assessCarouselContract(
    { expectedVisibleItems: 2, minimumItems: 4 },
    twoUp,
    { nextMoved: false, keyboardMoved: false }
  );
  assert.equal(result.status, 'failed');
  assert.ok(result.failures.includes('next_control_does_not_move'));
  assert.ok(result.failures.includes('keyboard_control_does_not_move'));
});

test('menu opens on click and closes on Escape or outside, not on hover', () => {
  assert.equal(assessClickOnlyMenu({
    opensOnClick: true, opensOnHover: false, closesOnEscape: true, closesOnOutside: true
  }).status, 'passed');
});

test('hover-only dropdown fails click-only navigation contract', () => {
  const result = assessClickOnlyMenu({
    opensOnClick: false, opensOnHover: true, closesOnEscape: false, closesOnOutside: false
  });
  assert.equal(result.status, 'failed');
  assert.ok(result.failures.includes('hover_opens_menu'));
});

test('missing interaction observation does not pass', () => {
  assert.equal(assessClickOnlyMenu({
    opensOnClick: true, opensOnHover: null, closesOnEscape: null, closesOnOutside: null
  }).status, 'needs_interaction_test');
});

test('responsive overflow catches excessive document width', () => {
  assert.equal(assessResponsiveOverflow([
    { viewportWidth: 375, documentWidth: 400 },
    { viewportWidth: 1440, documentWidth: 1440 }
  ]).status, 'failed');
  assert.equal(assessResponsiveOverflow([
    { viewportWidth: 375, documentWidth: 375 },
    { viewportWidth: 1440, documentWidth: 1440 }
  ]).status, 'passed');
  assert.equal(assessResponsiveOverflow([]).status, 'needs_interaction_test');
});
