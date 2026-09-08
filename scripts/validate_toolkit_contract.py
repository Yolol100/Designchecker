#!/usr/bin/env python3
"""Validate Design toolkit registration and owner boundaries, locally and in CI."""

import json, pathlib
c=json.load(open('toolkit-contract.json', encoding='utf-8'))
assert c.get('owner_skill') == 'design', 'Design must remain the canonical repository owner'
assert c.get('consumer_skills') == ['website-qa-checklist'], 'only Website QA may consume Designchecker cross-skill evidence'
for key in ('requires_account','requires_api_key','requires_mcp'):
    assert c.get(key) is False, f'{key} must be false'
ids=[t['id'] for t in c['tools']]
assert len(ids)==len(set(ids)), 'duplicate tool ids'
covered=set()
for a in c['usage_assertions']:
    assert a['tool'] in ids
    p=pathlib.Path(a['path']); assert p.is_file(), f'missing {p}'
    assert a['contains'] in p.read_text(encoding='utf-8'), f"{a['tool']} not wired in {p}"
    covered.add(a['tool'])
assert covered==set(ids), f'unwired tools: {set(ids)-covered}'
routes=json.load(open('config/direct-command-registry.json', encoding='utf-8'))['routes']
assert routes and all(r['owner']=='design' and r['project_id']=='project-design' for r in routes), 'cross-owner direct route present'
print('toolkit-contract: OK')
