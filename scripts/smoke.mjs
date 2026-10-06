import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  captureDesignBaseline,
  compareScreenshots,
  inspectDesign,
  scanAccessibility
} from '../dist/src/tools/index.js';

const target = process.env.SMOKE_URL ?? 'https://example.com';
const temp = await mkdtemp(path.join(os.tmpdir(), 'webactueel-smoke-'));

async function run(label, fn) {
  const result = await fn();
  if (!result || !['ok', 'partial'].includes(result.status)) throw new Error(`${label} returned invalid evidence`);
  console.log(`${label}: ${result.status}`);
  return result;
}

try {
  await run('design', () => inspectDesign(target));
  await run('a11y', () => scanAccessibility(target));
  const baseline = await run('baseline', () => captureDesignBaseline(target, temp));
  const first = baseline.data.captures[0]?.file;
  if (!first) throw new Error('Baseline produced no screenshot');
  const diff = await run('visual-diff', () => compareScreenshots(first, first, path.join(temp, 'self-diff.png')));
  if (diff.data.changedPixels !== 0) throw new Error('Self visual diff is not zero');
} finally {
  await rm(temp, { recursive: true, force: true });
}
