import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

test('browser network guard revalidates every HTTP(S) request instead of caching host approval', () => {
  const source = readFileSync(path.join(process.cwd(), 'src/core/browser.ts'), 'utf8');
  assert.equal(source.includes('checkedHosts'), false);
  assert.match(source, /await assertPublicTarget\(requestUrl\);/);
});
