import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const readJson = (file: string) => JSON.parse(readFileSync(path.join(process.cwd(), file), 'utf8')) as any;

test('skill, capability and tool routing registries are internally consistent', () => {
  const skills = readJson('config/skill-registry.json');
  const capabilities = readJson('config/capability-registry.json');
  const routing = readJson('config/tool-routing.json');
  const serverSource = readFileSync(path.join(process.cwd(), 'src/mcp/server.ts'), 'utf8');
  const skillMap = new Map(skills.skills.map((item: any) => [item.id, item]));
  const capabilityMap = new Map(capabilities.capabilities.map((item: any) => [item.id, item]));

  for (const skill of skills.skills) {
    for (const capabilityId of skill.capabilities) {
      const capability = capabilityMap.get(capabilityId) as any;
      assert.ok(capability, `Unknown capability ${capabilityId} on ${skill.id}`);
      assert.ok(capability.consumers.includes(skill.id), `${skill.id} is not a consumer of ${capabilityId}`);
    }
  }

  for (const route of routing.routes) {
    const skill = skillMap.get(route.domain_owner) as any;
    const capability = capabilityMap.get(route.capability) as any;
    assert.ok(skill, `Unknown domain owner ${route.domain_owner}`);
    assert.ok(capability, `Unknown route capability ${route.capability}`);
    assert.equal(route.project_id, skill.project_id, `Project mismatch for ${route.tool}`);
    assert.ok(capability.consumers.includes(route.domain_owner), `Capability ${route.capability} cannot be used by ${route.domain_owner}`);
    assert.equal(route.write_target, false, `${route.tool} must remain target-read-only`);
    assert.ok(route.selector_candidates.length > 0, `${route.tool} must declare source selector candidates`);
    assert.ok(serverSource.includes(`registerTool('${route.tool}'`), `${route.tool} is not registered by MCP server`);
  }

  const wp = skillMap.get('wordpressqualityarchitect') as any;
  assert.ok(wp.aliases.includes('programmeren'));
  assert.ok(wp.aliases.includes('snippet'));
  assert.ok((skillMap.get('leads') as any).aliases.includes('lead'));
  assert.ok((skillMap.get('website-qa-checklist') as any).aliases.includes('checklist'));
});
