import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyHealthSignals,
  detectCriticalHealthMarkers,
  isRelevantConsoleLocation,
  normalizeHealthTarget,
  shouldRecordRequestFailure
} from '../src/tools/health.js';

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

test('HTTP 5xx, 404 and unclassified 403 fail', () => {
  assert.equal(classifyHealthSignals({ ...base, httpStatus: 503 }).verdict, 'fail');
  assert.equal(classifyHealthSignals({ ...base, httpStatus: 404 }).verdict, 'fail');
  assert.equal(classifyHealthSignals({ ...base, httpStatus: 403 }).verdict, 'fail');
});

test('recognized access barrier and rate limiting warn instead of fail', () => {
  assert.equal(classifyHealthSignals({ ...base, httpStatus: 403, accessBlocked: true }).verdict, 'warning');
  assert.equal(classifyHealthSignals({ ...base, httpStatus: 429 }).verdict, 'warning');
});

test('WordPress critical error marker fails', () => {
  const markers = detectCriticalHealthMarkers('', 'There has been a critical error on this website.');
  assert.deepEqual(markers, ['wordpress-critical-error']);
  assert.equal(classifyHealthSignals({ ...base, criticalMarkers: markers }).verdict, 'fail');
});

test('blank public render fails', () => {
  assert.equal(classifyHealthSignals({ ...base, renderUsable: false }).verdict, 'fail');
});

test('missing title alone does not warn for an online healthcheck', () => {
  assert.equal(classifyHealthSignals({ ...base, title: '' }).verdict, 'pass');
});

test('browser runtime errors remain warnings', () => {
  assert.equal(classifyHealthSignals({ ...base, consoleErrors: ['ReferenceError'] }).verdict, 'warning');
  assert.equal(classifyHealthSignals({ ...base, pageErrors: ['Uncaught error'] }).verdict, 'warning');
});

test('intentional blocked write requests do not create request-failure warnings', () => {
  assert.equal(shouldRecordRequestFailure('POST', 'net::ERR_BLOCKED_BY_CLIENT'), false);
  assert.equal(shouldRecordRequestFailure('POST', 'net::ERR_FAILED'), false);
  assert.equal(shouldRecordRequestFailure('GET', 'net::ERR_BLOCKED_BY_CLIENT'), false);
  assert.equal(shouldRecordRequestFailure('GET', 'net::ERR_CONNECTION_RESET'), true);
  assert.equal(shouldRecordRequestFailure('HEAD', null), true);
});

test('console errors are bounded to inline or first-party sources', () => {
  assert.equal(isRelevantConsoleLocation('', 'example.com'), true);
  assert.equal(isRelevantConsoleLocation('https://example.com/app.js', 'example.com'), true);
  assert.equal(isRelevantConsoleLocation('https://www.example.com/app.js', 'example.com'), true);
  assert.equal(isRelevantConsoleLocation('https://cdn.thirdparty.test/script.js', 'example.com'), false);
});

test('bare domains normalize to HTTPS', () => {
  assert.equal(normalizeHealthTarget('example.com'), 'https://example.com');
  assert.equal(normalizeHealthTarget('https://example.com/path'), 'https://example.com/path');
});
