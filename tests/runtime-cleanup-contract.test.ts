import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const workflow = readFileSync(
  path.join(process.cwd(), '.github', 'workflows', 'runtime-cleanup.yml'),
  'utf8'
);

test('runtime cleanup requires same-repository push provenance', () => {
  assert.match(workflow, /github\.event\.workflow_run\.event == 'push'/);
  assert.match(workflow, /github\.event\.workflow_run\.head_repository\.full_name == github\.repository/);
  assert.match(workflow, /startsWith\(github\.event\.workflow_run\.head_branch, 'runtime\/'\)/);
});

test('runtime cleanup compares immutable run head SHA to current ref before deletion', () => {
  assert.match(workflow, /EXPECTED_HEAD_SHA: \$\{\{ github\.event\.workflow_run\.head_sha \}\}/);
  assert.match(workflow, /observed_sha=.*gh api .*git\/ref\/heads/);
  assert.match(workflow, /\$observed_sha" != "\$EXPECTED_HEAD_SHA"/);
  assert.ok(
    workflow.indexOf('if [[ "$observed_sha" != "$EXPECTED_HEAD_SHA" ]]') <
      workflow.indexOf('gh api --method DELETE'),
    'SHA mismatch guard must precede deletion'
  );
});

test('runtime cleanup fails closed on unexpected API errors and preserves updated branches', () => {
  assert.match(workflow, /Runtime branch head changed since triggering run; keeping branch intact/);
  assert.match(workflow, /\*\) printf '%s\\n' "\$observed_sha" >&2; exit "\$observed_status" ;;/);
  assert.match(workflow, /Runtime branch already absent/);
  assert.match(workflow, /set -euo pipefail/);
});
