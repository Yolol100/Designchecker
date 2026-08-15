#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const requestPath = process.env.WEBACTUEEL_COMMAND_FILE || 'requests/command.json';
const registry = JSON.parse(fs.readFileSync('config/direct-command-registry.json', 'utf8'));
const sourceBindings = JSON.parse(fs.readFileSync('config/project-source-bindings.json', 'utf8'));
const request = JSON.parse(fs.readFileSync(requestPath, 'utf8'));

if (request.enabled === false) {
  console.log('Command disabled; nothing to run.');
  process.exit(0);
}

const required = (value, label) => {
  if (value === undefined || value === null || value === '') throw new Error(`${label} is required.`);
  return value;
};

const requestId = String(required(request.request_id, 'request_id'));
if (!/^[a-zA-Z0-9._-]{6,120}$/.test(requestId)) throw new Error('request_id contains unsupported characters.');
const command = String(required(request.command, 'command'));
const owner = String(required(request.owner, 'owner'));
const source = required(request.source_context, 'source_context');
const route = registry.routes.find((item) => item.command === command && item.owner === owner);
if (!route) throw new Error(`No direct command route for ${command} owned by ${owner}.`);
if (route.status && route.status !== 'ready') throw new Error(route.blocked_reason || `Command route ${command}/${owner} is ${route.status}.`);

const binding = sourceBindings.bindings.find((item) => item.project_id === route.project_id);
if (!binding) throw new Error(`No registered project-source binding for ${route.project_id}.`);
if (binding.owner !== owner) throw new Error(`Project-source owner mismatch for ${route.project_id}.`);
if (binding.execution_status !== 'ready') throw new Error(`Project-source binding ${route.project_id} is not executable: ${binding.execution_status}.`);
if (request.project_id && request.project_id !== route.project_id) throw new Error(`project_id mismatch: ${request.project_id} != ${route.project_id}`);
if (source.integrity_status !== 'verified') throw new Error('source_context.integrity_status must be verified before execution.');
if (source.project_id !== route.project_id) throw new Error(`source_context.project_id mismatch: ${source.project_id} != ${route.project_id}`);
if (source.manifest_file_id !== binding.manifest_file_id) throw new Error(`source_context.manifest_file_id does not match registered manifest for ${route.project_id}.`);
if (!source.source_set_version || !source.checked_at) throw new Error('source_context requires source_set_version and checked_at.');
const checkedAt = Date.parse(source.checked_at);
if (!Number.isFinite(checkedAt)) throw new Error('source_context.checked_at is invalid.');
if (Date.now() - checkedAt > 24 * 60 * 60 * 1000) throw new Error('source_context is older than 24 hours; re-read the live Drive manifest.');
if (checkedAt - Date.now() > 10 * 60 * 1000) throw new Error('source_context.checked_at is unexpectedly in the future.');

const target = request.target ? String(request.target) : null;
const inputPath = request.input_path ? String(request.input_path) : null;
if (route.target_type === 'public_url' && !target) throw new Error('target is required for this command.');
if (route.target_type === 'repo_input_file') {
  if (!inputPath) throw new Error('input_path is required for this command.');
  const normalized = path.normalize(inputPath).replaceAll('\\', '/');
  if (!normalized.startsWith('requests/inputs/') || normalized.includes('../')) throw new Error('input_path must remain under requests/inputs/.');
}

if (route.preconditions.includes('lead_registry_preflight_verified')) {
  if (request.lead_registry_preflight?.status !== 'verified') throw new Error('Lead Registry preflight must be verified before Leads browser execution.');
  if (!request.lead_registry_preflight?.checked_at) throw new Error('lead_registry_preflight.checked_at is required.');
}
for (const field of ['lead_id', 'site_type', 'scan_policy_version']) {
  if (route.preconditions.includes(field) && !request[field]) throw new Error(`${field} is required.`);
}

const startedAt = new Date().toISOString();
let child;
const common = {
  encoding: 'utf8',
  maxBuffer: 30 * 1024 * 1024,
  env: {
    ...process.env,
    WEBACTUEEL_EVIDENCE_OWNER: route.owner,
    WEBACTUEEL_EVIDENCE_TOOL: route.tool
  }
};
if (route.executor.kind === 'cli') {
  child = spawnSync(process.execPath, ['dist/src/cli.js', route.executor.name, target], common);
} else if (route.executor.kind === 'python') {
  child = spawnSync('python3', [route.executor.path, target], common);
} else if (route.executor.kind === 'node' && command === 'lead-formal') {
  child = spawnSync(process.execPath, [route.executor.path], {
    ...common,
    env: {
      ...common.env,
      WEBACTUEEL_REQUEST_ID: requestId,
      TARGET_URL: target,
      LEAD_ID: String(request.lead_id),
      SITE_TYPE: String(request.site_type),
      SCAN_POLICY_VERSION: String(request.scan_policy_version)
    }
  });
} else if (route.executor.kind === 'node') {
  child = spawnSync(process.execPath, [route.executor.path, inputPath], common);
} else {
  throw new Error(`Unsupported executor kind: ${route.executor.kind}`);
}

let evidence = null;
try {
  if (child.stdout?.trim()) evidence = JSON.parse(child.stdout);
} catch {
  evidence = { raw_stdout: child.stdout };
}

const result = {
  schema_version: 'webactueel-command-result/1.2',
  request_id: requestId,
  status: child.status === 0 ? 'success' : 'failed',
  requested_by: request.requested_by || 'chatgpt-web',
  runtime: registry.runtime,
  command,
  target: target || inputPath,
  resolved_route: {
    controller: 'webactueel-workflow',
    domain_owner: route.owner,
    project_id: route.project_id,
    manifest_file_id: binding.manifest_file_id,
    tool: route.tool,
    capability: route.capability,
    target_type: route.target_type,
    write_target: false,
    evidence_scope: route.evidence_scope || null
  },
  source_context: source,
  preconditions: {
    lead_registry_preflight: request.lead_registry_preflight || null
  },
  started_at: startedAt,
  completed_at: new Date().toISOString(),
  exit_code: child.status,
  evidence,
  stderr: child.stderr?.trim() || null
};

fs.mkdirSync('results', { recursive: true });
const resultPath = path.join('results', `${requestId}.json`);
fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(resultPath);
if (child.status !== 0) process.exit(child.status || 1);
