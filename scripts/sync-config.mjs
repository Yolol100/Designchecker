#!/usr/bin/env node
import fs from 'node:fs';

const write = process.argv.includes('--write');
const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const stable = (value) => JSON.stringify(value);

const directPath = 'config/direct-command-registry.json';
const bindingsPath = 'config/project-source-bindings.json';
const integrationPath = 'config/designchecker-integration-contract.json';

const direct = readJson(directPath);
const bindings = readJson(bindingsPath);
const integration = readJson(integrationPath);

const binding = bindings.bindings.find((item) => item.project_id === 'project-design' && item.owner === 'design');
if (!binding) throw new Error('Missing canonical project-design binding');

const directRoutes = direct.routes.filter((route) => route.owner === 'design' && route.project_id === 'project-design');
const directByCommand = new Map(directRoutes.map((route) => [route.command, route]));
const integrationRoutes = integration.design?.routes ?? [];
const integrationByCommand = new Map(integrationRoutes.map((route) => [route.command, route]));

const errors = [];
if (integration.design?.owner !== 'design') errors.push('integration.design.owner must remain design');
if (integration.design?.project_id !== 'project-design') errors.push('integration.design.project_id must remain project-design');
if (integration.design?.manifest_file_id !== binding.manifest_file_id) {
  errors.push('integration manifest_file_id drifted from project-source-bindings');
}
if (integration.design?.route_source !== directPath) {
  errors.push('integration route_source must point to direct-command-registry.json');
}

const directCommands = [...directByCommand.keys()].sort();
const integrationCommands = [...integrationByCommand.keys()].sort();
if (stable(directCommands) !== stable(integrationCommands)) {
  errors.push('integration route command set drifted from direct-command-registry');
}
for (const [command, route] of directByCommand) {
  const mirror = integrationByCommand.get(command);
  if (!mirror) continue;
  if (stable(mirror.selectors) !== stable(route.source_selectors)) {
    errors.push(`${command}: selectors drifted from direct-command-registry`);
  }
}

if (write) {
  integration.design.manifest_file_id = binding.manifest_file_id;
  integration.design.route_source = directPath;
  const existingByCommand = new Map(integrationRoutes.map((route) => [route.command, route]));
  integration.design.routes = directRoutes.map((route) => {
    const existing = existingByCommand.get(route.command);
    if (!existing) {
      throw new Error(`Cannot generate compatibility route ${route.command}: descriptive integration metadata is missing`);
    }
    return { ...existing, selectors: route.source_selectors };
  });
  fs.writeFileSync(integrationPath, JSON.stringify(integration, null, 2) + '\n');
  console.log('Designchecker config mirrors synchronized.');
  process.exit(0);
}

if (errors.length) {
  console.error('DESIGNCHECKER CONFIG CHECK: FAIL');
  for (const error of errors) console.error('- ' + error);
  console.error('Run: npm run config:sync');
  process.exit(1);
}
console.log(`DESIGNCHECKER CONFIG CHECK: PASS (${directRoutes.length} canonical Design routes)`);
