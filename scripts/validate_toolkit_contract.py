#!/usr/bin/env python3
"""Validate Design toolkit registration and owner boundaries, locally and in CI."""

import json
import pathlib
import re

c = json.load(open('toolkit-contract.json', encoding='utf-8'))
assert c.get('owner_skill') == 'design', 'Design must remain the canonical repository owner'
assert c.get('consumer_skills') == ['website-qa-checklist'], 'only Website QA may consume Designchecker cross-skill evidence'
for key in ('requires_account', 'requires_api_key', 'requires_mcp'):
    assert c.get(key) is False, f'{key} must be false'

ids = [t['id'] for t in c['tools']]
assert len(ids) == len(set(ids)), 'duplicate tool ids'
covered = set()
for a in c['usage_assertions']:
    assert a['tool'] in ids
    p = pathlib.Path(a['path'])
    assert p.is_file(), f'missing {p}'
    assert a['contains'] in p.read_text(encoding='utf-8'), f"{a['tool']} not wired in {p}"
    covered.add(a['tool'])
assert covered == set(ids), f'unwired tools: {set(ids) - covered}'

bindings = json.load(open('config/project-source-bindings.json', encoding='utf-8'))['bindings']
assert len(bindings) == 1, 'Designchecker must keep exactly one project-source binding'
assert bindings[0].get('project_id') == 'project-design' and bindings[0].get('owner') == 'design', 'cross-owner project-source binding present'
assert bindings[0].get('manifest_file_id') == '12g8WkgS_ICPBKW6U3OO2h1ksB8nbKPLg', 'Project Design manifest ID drift'

routes = json.load(open('config/direct-command-registry.json', encoding='utf-8'))['routes']
assert routes and all(r['owner'] == 'design' and r['project_id'] == 'project-design' for r in routes), 'cross-owner direct route present'

expected_cli = {
    r['executor']['name']
    for r in routes
    if r.get('executor', {}).get('kind') == 'cli'
}
cli_source = pathlib.Path('src/cli.ts').read_text(encoding='utf-8')
actual_cli = set(re.findall(r"case '([^']+)'", cli_source))
assert actual_cli == expected_cli, f'CLI/registry drift: actual={sorted(actual_cli)} expected={sorted(expected_cli)}'

index_source = pathlib.Path('src/tools/index.ts').read_text(encoding='utf-8')
for forbidden in (
    'inspectSeo', 'checkLinks', 'inspectElementor', 'inspectLeadSite',
    'collectQaEvidence', 'checkWebsiteHealth', 'runLighthouse', 'validateHtml'
):
    assert forbidden not in index_source, f'cross-owner tool leaked through public Design index: {forbidden}'

print('toolkit-contract: OK')
