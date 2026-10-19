import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('Chrome DevTools MCP is optional, version-pinned and runs isolated', () => {
  const config = JSON.parse(readFileSync('.mcp.json', 'utf8'));
  assert.deepEqual(Object.keys(config), ['mcpServers']);
  assert.deepEqual(Object.keys(config.mcpServers), ['chrome-devtools']);
  const server = config.mcpServers['chrome-devtools'];
  assert.equal(server.command, 'npx');
  assert.deepEqual(server.args, [
    '--yes',
    'chrome-devtools-mcp@1.11.0',
    '--headless',
    '--isolated',
    '--no-usage-statistics',
    '--no-performance-crux'
  ]);
});

test('Existing Playwright and Pixelmatch remain canonical; no duplicate installer', () => {
  const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
  for (const name of ['playwright', 'pixelmatch', 'sharp']) {
    assert.equal(typeof manifest.dependencies[name], 'string', `${name} dependency missing`);
  }
  assert.equal(Object.hasOwn(manifest.scripts, 'devtools:mcp'), false);
  assert.equal(Object.hasOwn(manifest.dependencies, 'chrome-devtools-mcp'), false);
  assert.equal(Object.hasOwn(manifest.dependencies, 'gsap'), false);
});

test('Optional MCP docs do not promise a connected ChatGPT or local Chrome session', () => {
  const docs = readFileSync('docs/CHROME-DEVTOOLS-EN-ANIMATIES.md', 'utf8').toLowerCase();
  assert.equal(docs.includes('localwp'), false);
  assert.match(docs, /niet op je pc geinstalleerd/);
  assert.match(docs, /read.only.garantie niet/);
});
