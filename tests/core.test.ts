import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSafeTarget, isBlockedAddress } from '../src/core/url.js';
import { evidence } from '../src/core/evidence.js';

test('safe target accepts public https', () => {
  assert.equal(assertSafeTarget('https://example.com/path').hostname, 'example.com');
});

test('safe target blocks localhost and private literal targets by default', () => {
  delete process.env.ALLOW_PRIVATE_TARGETS;
  for (const target of ['http://localhost:3000', 'http://127.0.0.1', 'http://10.0.0.1', 'http://169.254.169.254', 'http://192.168.1.2', 'http://[::1]']) {
    assert.throws(() => assertSafeTarget(target), /blocked/i, target);
  }
});

test('address classifier blocks non-public ranges used by SSRF targets', () => {
  for (const address of ['127.0.0.1','10.0.0.1','100.64.0.1','169.254.169.254','192.168.1.2','192.0.2.1','198.51.100.2','203.0.113.5','::1','fd00::1','fe80::1','2001:db8::1']) {
    assert.equal(isBlockedAddress(address), true, address);
  }
  assert.equal(isBlockedAddress('8.8.8.8'), false);
  assert.equal(isBlockedAddress('1.1.1.1'), false);
  assert.equal(isBlockedAddress('2606:4700:4700::1111'), false);
});

test('evidence preserves owner and limits', () => {
  const result = evidence({ owner: 'design', tool: 'x', data: { ok: true }, limits: ['manual test required'] });
  assert.equal(result.owner, 'design');
  assert.deepEqual(result.limits, ['manual test required']);
  assert.equal(result.schemaVersion, '1.0');
});
