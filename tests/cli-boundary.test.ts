import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

test('public CLI exactly matches registered Design CLI executors', () => {
  const registry = JSON.parse(readFileSync(path.join(process.cwd(), 'config/direct-command-registry.json'), 'utf8'));
  const expected = new Set<string>(
    registry.routes
      .filter((route: any) => route.owner === 'design' && route.project_id === 'project-design' && route.executor?.kind === 'cli')
      .map((route: any) => route.executor.name)
  );
  const cliSource = readFileSync(path.join(process.cwd(), 'src/cli.ts'), 'utf8');
  const actual = new Set([...cliSource.matchAll(/case '([^']+)'/g)].map((match) => match[1]));
  assert.deepEqual([...actual].sort(), [...expected].sort());
});

test('public Design tool index does not expose cross-owner helpers', () => {
  const indexSource = readFileSync(path.join(process.cwd(), 'src/tools/index.ts'), 'utf8');
  for (const forbidden of [
    'inspectSeo', 'checkLinks', 'inspectElementor', 'inspectLeadSite',
    'collectQaEvidence', 'checkWebsiteHealth', 'runLighthouse', 'validateHtml'
  ]) {
    assert.equal(indexSource.includes(forbidden), false, forbidden);
  }
});
