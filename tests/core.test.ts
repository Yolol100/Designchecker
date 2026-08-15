import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSafeTarget } from '../src/core/url.js';
import { evidence } from '../src/core/evidence.js';

test('safe target accepts public https', () => {
  assert.equal(assertSafeTarget('https://example.com/path').hostname, 'example.com');
});

test('safe target blocks localhost by default', () => {
  delete process.env.ALLOW_PRIVATE_TARGETS;
  assert.throws(() => assertSafeTarget('http://localhost:3000'), /blocked/i);
});

test('evidence preserves owner and limits', () => {
  const result = evidence({ owner: 'design', tool: 'x', data: { ok: true }, limits: ['manual test required'] });
  assert.equal(result.owner, 'design');
  assert.deepEqual(result.limits, ['manual test required']);
  assert.equal(result.schemaVersion, '1.0');
});
