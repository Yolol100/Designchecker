#!/usr/bin/env python3
"""Validate Designchecker toolkit registration and bounded owner routes, locally and in CI."""

import json, pathlib
c=json.load(open('toolkit-contract.json', encoding='utf-8'))
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
assert routes, 'direct routes missing'
for route in routes:
    owner=route['owner']
    project=route['project_id']
    if owner == 'design':
        assert project == 'project-design', f'Design route project mismatch: {route}'
    elif owner == 'website-qa-checklist':
        assert project == 'project-checklist', f'Website QA route project mismatch: {route}'
        assert route['command'] in {'qa-zap-baseline','qa-tls'}, f'unapproved Website QA direct route: {route}'
    else:
        raise AssertionError(f'unsupported direct owner: {owner}')
print('toolkit-contract: OK')
