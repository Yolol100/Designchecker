#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { checkWebsiteHealth, normalizeHealthTarget } from '../dist/src/tools/health.js';

const MAX_TARGETS = 150;
const DEFAULT_CONCURRENCY = 4;

function parseArgs(argv) {
  const out = { targets: [], targetsFile: null, summary: null, output: 'results/healthcheck.json', screenshotDir: 'results/healthcheck-screenshots', concurrency: DEFAULT_CONCURRENCY, failOnWarning: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--target') out.targets.push(argv[++i]);
    else if (arg === '--targets-json') out.targets.push(...parseTargetsJson(argv[++i]));
    else if (arg === '--targets-file') out.targetsFile = argv[++i];
    else if (arg === '--summary') out.summary = argv[++i];
    else if (arg === '--output') out.output = argv[++i];
    else if (arg === '--screenshot-dir') out.screenshotDir = argv[++i];
    else if (arg === '--concurrency') out.concurrency = Number(argv[++i]);
    else if (arg === '--fail-on-warning') out.failOnWarning = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return out;
}

function parseTargetsJson(raw) {
  const parsed = JSON.parse(String(raw));
  if (!Array.isArray(parsed)) throw new Error('Targets JSON must be an array.');
  return parsed;
}

function readTargetsFile(file) {
  return parseTargetsJson(fs.readFileSync(file, 'utf8'));
}

function readSummary(file) {
  const lines = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error('summary.tsv contains no site rows.');
  const header = lines[0].split('\t');
  const domainIndex = header.indexOf('domain');
  const statusIndex = header.indexOf('status');
  const detailIndex = header.indexOf('detail');
  if (domainIndex < 0) throw new Error('summary.tsv requires a domain column.');
  return lines.slice(1).map((line) => {
    const cols = line.split('\t');
    return {
      domain: cols[domainIndex] || '',
      updateStatus: statusIndex >= 0 ? cols[statusIndex] || null : null,
      updateDetail: detailIndex >= 0 ? cols.slice(detailIndex).join('\t') || null : null
    };
  }).filter((item) => item.domain);
}

function normalizeInput(item) {
  if (typeof item === 'string') return { target: normalizeHealthTarget(item), metadata: null };
  if (!item || typeof item !== 'object') throw new Error('Each target must be a string or object.');
  const raw = item.url || item.target || item.domain;
  if (!raw) throw new Error('Target object requires url, target or domain.');
  return {
    target: normalizeHealthTarget(String(raw)),
    metadata: {
      domain: item.domain ? String(item.domain) : null,
      updateStatus: item.updateStatus ? String(item.updateStatus) : null,
      updateDetail: item.updateDetail ? String(item.updateDetail) : null
    }
  };
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

const options = parseArgs(process.argv.slice(2));
let rawTargets = [...options.targets];
if (options.targetsFile) rawTargets.push(...readTargetsFile(options.targetsFile));
if (options.summary) rawTargets.push(...readSummary(options.summary));
if (rawTargets.length === 0) throw new Error('Provide --target, --targets-json, --targets-file or --summary.');

const concurrency = Number.isInteger(options.concurrency) && options.concurrency >= 1 && options.concurrency <= 8
  ? options.concurrency
  : DEFAULT_CONCURRENCY;
const normalized = rawTargets.map(normalizeInput);
const unique = [];
const seen = new Set();
for (const item of normalized) {
  const key = item.target;
  if (seen.has(key)) continue;
  seen.add(key);
  unique.push(item);
}
if (unique.length > MAX_TARGETS) throw new Error(`Healthcheck supports at most ${MAX_TARGETS} unique targets per run.`);

const startedAt = new Date().toISOString();
const browser = await chromium.launch({ headless: true });
let items;
try {
  items = await mapLimit(unique, concurrency, async (item, index) => {
    try {
      const envelope = await checkWebsiteHealth(item.target, {
        browser,
        screenshotDir: options.screenshotDir,
        screenshotName: `${String(index + 1).padStart(3, '0')}-${new URL(item.target).hostname.replace(/[^a-z0-9.-]+/gi, '_')}`
      });
      return { input: item.metadata, ...envelope };
    } catch (error) {
      return {
        input: item.metadata,
        schemaVersion: '1.0',
        owner: 'website-qa-checklist',
        tool: 'qa_post_update_healthcheck',
        target: item.target,
        evidenceLevel: 'production_observation',
        capturedAt: new Date().toISOString(),
        status: 'error',
        data: {
          verdict: 'fail',
          failures: ['runner_error'],
          warnings: [],
          navigationError: error instanceof Error ? error.message : String(error)
        },
        limits: ['Healthcheck runner failed before a complete public-browser observation could be collected.']
      };
    }
  });
} finally {
  await browser.close().catch(() => undefined);
}

const passCount = items.filter((item) => item.data?.verdict === 'pass').length;
const warningCount = items.filter((item) => item.data?.verdict === 'warning').length;
const failCount = items.filter((item) => item.data?.verdict === 'fail').length;
const result = {
  schemaVersion: 'designchecker-healthcheck/1.0',
  startedAt,
  completedAt: new Date().toISOString(),
  concurrency,
  targetCount: items.length,
  summary: { pass: passCount, warning: warningCount, fail: failCount },
  items
};

fs.mkdirSync(path.dirname(options.output), { recursive: true });
fs.writeFileSync(options.output, `${JSON.stringify(result, null, 2)}\n`);
console.log(`Healthcheck: ${items.length} targets | PASS ${passCount} | WARNING ${warningCount} | FAIL ${failCount}`);
console.log(`Result: ${options.output}`);

if (failCount > 0 || (options.failOnWarning && warningCount > 0)) process.exitCode = 2;
