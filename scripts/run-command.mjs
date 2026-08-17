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

const assertRepoEvidencePath = (value, label) => {
  const input = String(required(value, label));
  const normalized = path.normalize(input).replaceAll('\\', '/');
  if (!normalized.startsWith('results/evidence/') || normalized.includes('../')) throw new Error(`${label} must remain under results/evidence/.`);
  if (!fs.existsSync(normalized) || !fs.statSync(normalized).isFile()) throw new Error(`${label} must reference an existing evidence file.`);
  return normalized;
};

const requestId = String(required(request.request_id, 'request_id'));
if (!/^[a-zA-Z0-9._-]{6,120}$/.test(requestId)) throw new Error('request_id contains unsupported characters.');
const command = String(required(request.command, 'command'));
const owner = String(required(request.owner, 'owner'));
const source = required(request.source_context, 'source_context');
const route = registry.routes.find((item) => item.command === command && item.owner === owner);
if (!route) throw new Error(`No direct command route for ${command} owned by ${owner}.`);
if (route.status && route.status !== 'ready') throw new Error(route.blocked_reason || `Command route ${command}/${owner} is ${route.status}.`);
if (route.owner !== 'design') throw new Error(`Designchecker direct runtime refuses non-Design owner: ${route.owner}.`);
if (route.executor?.kind !== 'cli') throw new Error(`Designchecker direct runtime only permits Design CLI executors, got: ${route.executor?.kind || 'missing'}.`);
if (!['public_url', 'repo_evidence_pair'].includes(route.target_type)) throw new Error(`Designchecker direct runtime refuses target_type: ${route.target_type}.`);

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

if (route.preconditions.includes('selected_source_selector')) {
  if (!Array.isArray(source.selector_ids) || source.selector_ids.length === 0) throw new Error('source_context.selector_ids is required for this command.');
  const matched = source.selector_ids.filter((selector) => route.source_selectors?.includes(selector));
  if (matched.length === 0) throw new Error(`No selected source selector is valid for ${command}/${owner}.`);
}

const target = request.target ? String(request.target) : null;
let beforePath = null;
let afterPath = null;
if (route.target_type === 'public_url' && !target) throw new Error('target is required for this command.');
if (route.target_type === 'repo_evidence_pair') {
  beforePath = assertRepoEvidencePath(request.before_path, 'before_path');
  afterPath = assertRepoEvidencePath(request.after_path, 'after_path');
}

const evidenceRoot = path.join('results', 'evidence', requestId);
fs.mkdirSync(evidenceRoot, { recursive: true });
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

if (command === 'design-baseline') {
  const baselineDir = path.join(evidenceRoot, 'baseline');
  child = spawnSync(process.execPath, ['dist/src/cli.js', route.executor.name, target, baselineDir], common);
} else if (command === 'design-diff') {
  const diffPath = path.join(evidenceRoot, 'visual-diff.png');
  child = spawnSync(process.execPath, ['dist/src/cli.js', route.executor.name, beforePath, afterPath, diffPath], common);
} else {
  child = spawnSync(process.execPath, ['dist/src/cli.js', route.executor.name, target], common);
}

let evidence = null;
try {
  if (child.stdout?.trim()) evidence = JSON.parse(child.stdout);
} catch {
  evidence = { raw_stdout: child.stdout };
}

const resolvedTarget = target || `${beforePath} -> ${afterPath}`;
const result = {
  schema_version: 'webactueel-command-result/1.3',
  request_id: requestId,
  status: child.status === 0 ? 'success' : 'failed',
  requested_by: request.requested_by || 'chatgpt-web',
  runtime: registry.runtime,
  runtime_capability: registry.runtime_capability || 'designchecker-direct',
  command,
  target: resolvedTarget,
  resolved_route: {
    controller: 'webactueel-workflow',
    domain_owner: route.owner,
    project_id: route.project_id,
    manifest_file_id: binding.manifest_file_id,
    tool: route.tool,
    capability: route.capability,
    target_type: route.target_type,
    write_target: false,
    evidence_scope: route.evidence_scope || null,
    selected_source_selectors: Array.isArray(source.selector_ids) ? source.selector_ids.filter((selector) => route.source_selectors?.includes(selector)) : []
  },
  source_context: source,
  preconditions: {},
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
