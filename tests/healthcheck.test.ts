import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyHealthSignals, detectCriticalHealthMarkers, normalizeHealthTarget } from '../src/tools/health.js';

const base = {
  httpStatus: 200,
  navigationError: null,
  accessBlocked: false,
  renderUsable: true,
  title: 'Healthy site',
  criticalMarkers: [],
  consoleErrors: [],
  pageErrors: [],
  firstPartyHttpErrors: [],
  firstPartyRequestFailures: []
};

test('healthy rendered homepage passes', () => {
  assert.equal(classifyHealthSignals(base).verdict, 'pass');
});

test('HTTP 5xx and missing homepage fail', () => {
  assert.equal(classifyHealthSignals({ ...base, httpStatus: 503 }).verdict, 'fail');
  assert.equal(classifyHealthSignals({ ...base, httpStatus: 404 }).verdict, 'fail');
});

test('WordPress critical error marker fails', () => {
  const markers = detectCriticalHealthMarkers('', 'There has been a critical error on this website.');
  assert.deepEqual(markers, ['wordpress-critical-error']);
  assert.equal(classifyHealthSignals({ ...base, criticalMarkers: markers }).verdict, 'fail');
});

test('blank public render fails', () => {
  assert.equal(classifyHealthSignals({ ...base, renderUsable: false }).verdict, 'fail');
});

test('WAF block and browser errors remain warnings', () => {
  assert.equal(classifyHealthSignals({ ...base, httpStatus: 403, accessBlocked: true }).verdict, 'warning');
  assert.equal(classifyHealthSignals({ ...base, consoleErrors: ['ReferenceError'] }).verdict, 'warning');
});

test('bare domains normalize to HTTPS', () => {
  assert.equal(normalizeHealthTarget('example.com'), 'https://example.com');
  assert.equal(normalizeHealthTarget('https://example.com/path'), 'https://example.com/path');
});
