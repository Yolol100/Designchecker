import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const readJson = (file: string) => JSON.parse(readFileSync(path.join(process.cwd(), file), 'utf8')) as any;

test('skill, capability and MCP tool routing registries are internally consistent', () => {
  const skills = readJson('config/skill-registry.json');
  const capabilities = readJson('config/capability-registry.json');
  const routing = readJson('config/tool-routing.json');
  const serverSource = readFileSync(path.join(process.cwd(), 'src/mcp/server.ts'), 'utf8');
  const skillMap = new Map(skills.skills.map((item: any) => [item.id, item]));
  const capabilityMap = new Map(capabilities.capabilities.map((item: any) => [item.id, item]));
  for (const skill of skills.skills) for (const capabilityId of skill.capabilities) {
    const capability = capabilityMap.get(capabilityId) as any;
    assert.ok(capability, `Unknown capability ${capabilityId} on ${skill.id}`);
    assert.ok(capability.consumers.includes(skill.id), `${skill.id} is not a consumer of ${capabilityId}`);
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
    assert.ok(serverSource.includes(`registerTool('${route.tool}'`), `${route.tool} is not registered by optional MCP server`);
  }
  const wp = skillMap.get('wordpressqualityarchitect') as any;
  assert.ok(wp.aliases.includes('programmeren'));
  assert.ok(wp.aliases.includes('snippet'));
  assert.ok((skillMap.get('leads') as any).aliases.includes('lead'));
  assert.ok((skillMap.get('website-qa-checklist') as any).aliases.includes('checklist'));
});

test('direct ChatGPT Web commands remain owner/source/capability bound without MCP', () => {
  const skills = readJson('config/skill-registry.json');
  const capabilities = readJson('config/capability-registry.json');
  const direct = readJson('config/direct-command-registry.json');
  const sources = readJson('config/project-source-bindings.json');
  const integration = readJson('config/designchecker-integration-contract.json');
  const skillMap = new Map(skills.skills.map((item: any) => [item.id, item]));
  const capabilityMap = new Map(capabilities.capabilities.map((item: any) => [item.id, item]));
  const bindingMap = new Map(sources.bindings.map((item: any) => [item.project_id, item]));
  assert.equal(direct.runtime_capability, 'designchecker-direct');
  assert.equal(skills.default_chatgpt_web_runtime, 'designchecker-direct');
  assert.equal(integration.runtime_capability, 'designchecker-direct');
  assert.equal(direct.mcp_required, false);
  assert.equal(direct.api_key_required, false);
  assert.equal(direct.additional_account_required, false);
  assert.equal(direct.source_integrity_required, true);
  const runtimeCapability = capabilityMap.get('designchecker-direct') as any;
  assert.ok(runtimeCapability);
  assert.equal(runtimeCapability.mcp_required, false);
  assert.equal(runtimeCapability.api_key_required, false);
  assert.equal(runtimeCapability.additional_account_required, false);
  assert.equal(runtimeCapability.automatic_selection, true);
  for (const owner of ['webactueel-workflow','design','seo','elementor','wordpressqualityarchitect','leads','website-qa-checklist']) {
    assert.ok(runtimeCapability.consumers.includes(owner), `${owner} must be able to use Designchecker direct runtime`);
  }

  const allowedBindingStatuses = new Set(['ready', 'blocked-source-integrity']);
  for (const binding of sources.bindings) {
    assert.ok(allowedBindingStatuses.has(binding.execution_status), `Unsupported binding status ${binding.execution_status}`);
    assert.ok(binding.manifest_file_id, `Missing manifest ID for ${binding.project_id}`);
    if (binding.execution_status !== 'ready') assert.ok(binding.blocking_reason, `Blocked binding ${binding.project_id} requires a blocking reason`);
  }

  for (const route of direct.routes) {
    const skill = skillMap.get(route.owner) as any;
    const capability = capabilityMap.get(route.capability) as any;
    const binding = bindingMap.get(route.project_id) as any;
    assert.ok(skill, `Unknown direct owner ${route.owner}`);
    assert.ok(capability, `Unknown direct capability ${route.capability}`);
    assert.ok(binding, `Missing source binding ${route.project_id}`);
    assert.equal(route.project_id, skill.project_id, `Direct project mismatch for ${route.command}/${route.owner}`);
    assert.equal(binding.owner, route.owner, `Source owner mismatch for ${route.project_id}`);
    assert.ok(capability.consumers.includes(route.owner), `${route.owner} cannot consume ${route.capability}`);
    assert.ok(route.preconditions.includes('verified_live_source'), `${route.command}/${route.owner} must require verified live source`);
    if (route.preconditions.includes('selected_source_selector')) {
      assert.ok(Array.isArray(route.source_selectors) && route.source_selectors.length > 0, `${route.command}/${route.owner} must declare valid source selectors`);
    }
  }

  const designRoutes = direct.routes.filter((route: any) => route.owner === 'design');
  for (const command of ['design', 'a11y', 'design-baseline', 'design-diff']) {
    const route = designRoutes.find((candidate: any) => candidate.command === command);
    assert.ok(route, `Missing Design direct command ${command}`);
    assert.ok(route.preconditions.includes('selected_source_selector'), `${command} must be source-selector bound`);
    assert.ok(route.trigger_when && route.do_not_trigger_when && route.why, `${command} must explain when, when not and why it runs`);
  }
  assert.equal(designRoutes.find((route: any) => route.command === 'design-baseline').capability, 'browser-baseline');
  assert.equal(designRoutes.find((route: any) => route.command === 'design-diff').capability, 'visual-diff');
  assert.equal(designRoutes.find((route: any) => route.command === 'design-diff').target_type, 'repo_input_pair');
  assert.equal(integration.design.manifest_file_id, (bindingMap.get('project-design') as any).manifest_file_id);
  assert.deepEqual(integration.decision_order.slice(0, 5), ['goal','domain_owner','live_project_manifest','task_source_selectors','required_evidence_level']);

  const formalLead = direct.routes.find((route: any) => route.command === 'lead-formal');
  assert.ok(formalLead.preconditions.includes('lead_registry_preflight_verified'));
  assert.equal(formalLead.status, 'blocked-contract');
  assert.match(formalLead.blocked_reason, /webactueel-leadscanner-ingest\/1\.0/);

  const leadsBinding = bindingMap.get('project-leads') as any;
  assert.equal(leadsBinding.formal_scan_status, 'blocked-contract');
  assert.match(leadsBinding.formal_scan_reason, /webactueel-leadscanner-ingest\/1\.0/);

  const seoBinding = bindingMap.get('project-seo') as any;
  assert.equal(seoBinding.execution_status, 'blocked-source-integrity');
  assert.ok(seoBinding.rollback_folder_id);

  const seoTechnical = direct.routes.find((route: any) => route.command === 'seo-technical');
  assert.match(seoTechnical.scope_note, /does not claim full parity/i);
});

test('direct command runner enforces Design source selectors and supports baseline/diff artifacts', () => {
  const runner = readFileSync(path.join(process.cwd(), 'scripts/run-command.mjs'), 'utf8');
  assert.match(runner, /source_context\.selector_ids is required/);
  assert.match(runner, /No selected source selector is valid/);
  assert.match(runner, /command === 'design-baseline'/);
  assert.match(runner, /command === 'design-diff'/);
  assert.match(runner, /results', 'artifacts', requestId/);
  assert.match(runner, /before_path/);
  assert.match(runner, /after_path/);
});
