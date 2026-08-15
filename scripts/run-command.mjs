#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const requestPath = process.env.WEBACTUEEL_COMMAND_FILE || 'requests/command.json';
const routingPath = 'config/tool-routing.json';
const request = JSON.parse(fs.readFileSync(requestPath, 'utf8'));
const routing = JSON.parse(fs.readFileSync(routingPath, 'utf8'));

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
const target = String(required(request.target, 'target'));
const owner = request.owner ? String(request.owner) : null;
const projectId = request.project_id ? String(request.project_id) : null;
const source = request.source_context || null;

const fixed = {
  design: { cli: 'design', tool: 'design_inspect_page', owner: 'design' },
  seo: { cli: 'seo', tool: 'seo_inspect_page', owner: 'seo' },
  elementor: { cli: 'elementor', tool: 'elementor_inspect_page', owner: 'elementor' },
  leads: { cli: 'leads', tool: 'lead_inspect_public_site', owner: 'leads' },
  qa: { cli: 'qa', tool: 'qa_collect_page_evidence', owner: 'website-qa-checklist' }
};

const byOwner = {
  a11y: {
    design: 'design_accessibility_risks',
    'website-qa-checklist': 'qa_accessibility_risks'
  },
  links: {
    seo: 'seo_check_links',
    'website-qa-checklist': 'qa_check_links'
  },
  performance: {
    seo: 'seo_performance_lab',
    wordpressqualityarchitect: 'wordpress_performance_lab',
    'website-qa-checklist': 'qa_performance_lab'
  },
  html: {
    seo: 'seo_validate_html',
    wordpressqualityarchitect: 'wordpress_validate_html',
    'website-qa-checklist': 'qa_validate_html'
  }
};

let cliCommand;
let toolName;
let resolvedOwner;
if (fixed[command]) {
  cliCommand = fixed[command].cli;
  toolName = fixed[command].tool;
  resolvedOwner = fixed[command].owner;
  if (owner && owner !== resolvedOwner) throw new Error(`owner mismatch: ${owner} != ${resolvedOwner}`);
} else if (byOwner[command]) {
  resolvedOwner = required(owner, `owner for ${command}`);
  toolName = byOwner[command][resolvedOwner];
  if (!toolName) throw new Error(`Unsupported owner ${resolvedOwner} for command ${command}.`);
  cliCommand = command;
} else {
  throw new Error(`Unsupported command: ${command}`);
}

const route = routing.routes.find((item) => item.tool === toolName);
if (!route) throw new Error(`No routing contract found for tool ${toolName}.`);
if (route.domain_owner !== resolvedOwner) throw new Error(`Routing owner mismatch for ${toolName}.`);
if (projectId && route.project_id !== projectId) throw new Error(`project_id mismatch: ${projectId} != ${route.project_id}`);
if (!source) throw new Error('source_context is required; ChatGPT must resolve the live project source before dispatch.');
if (source.project_id !== route.project_id) throw new Error(`source_context.project_id mismatch: ${source.project_id} != ${route.project_id}`);
if (!source.manifest_file_id || !source.source_set_version || !source.checked_at) {
  throw new Error('source_context requires manifest_file_id, source_set_version and checked_at.');
}

const startedAt = new Date().toISOString();
const child = spawnSync(process.execPath, ['dist/src/cli.js', cliCommand, target], {
  encoding: 'utf8',
  env: process.env,
  maxBuffer: 20 * 1024 * 1024
});

let evidence = null;
try {
  if (child.stdout?.trim()) evidence = JSON.parse(child.stdout);
} catch {
  evidence = { raw_stdout: child.stdout };
}

const result = {
  schema_version: 'webactueel-command-result/1.0',
  request_id: requestId,
  status: child.status === 0 ? 'success' : 'failed',
  requested_by: request.requested_by || 'chatgpt-web',
  command,
  target,
  resolved_route: {
    controller: routing.controller,
    domain_owner: route.domain_owner,
    project_id: route.project_id,
    tool: route.tool,
    capability: route.capability,
    selector_candidates: route.selector_candidates,
    evidence_level: route.evidence_level,
    write_target: route.write_target
  },
  source_context: source,
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
