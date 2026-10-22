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
  const design = await run('design', () => inspectDesign(target));
  // Verify the new design evidence really survives a Chromium page.evaluate roundtrip.
  // Access interstitials remain partial evidence, never a misleading PASS.
  if (design.status === 'ok') {
    for (const key of ['visualStyles', 'animationSamples', 'videoSamples']) {
      if (!Array.isArray(design.data?.[key])) throw new Error(`Design evidence missing ${key}`);
    }
    if (design.data.motionPreference !== 'no-preference') throw new Error('Design inspection did not capture the normal-motion state');
    if (!Array.isArray(design.data.sourceAssets?.assets) || !Array.isArray(design.data.sourceAssets?.limits)) throw new Error('Design media inventory was not captured');
    if (design.data.sourceAssets.assets.length > 120) throw new Error('Design media inventory exceeds its declared bound');
    if (design.data.visualStyles.length === 0) throw new Error('Design evidence has no computed style samples');
    if (!design.data.visualStyles.some((sample) => typeof sample.fontFamily === 'string' && typeof sample.transitionDuration === 'string')) {
      throw new Error('Computed style samples are incomplete');
    }
  }
  await run('a11y', () => scanAccessibility(target));
  const baseline = await run('baseline', () => captureDesignBaseline(target, temp));
  const first = baseline.data.captures[0]?.file;
  if (!first) throw new Error('Baseline produced no screenshot');
  const diff = await run('visual-diff', () => compareScreenshots(first, first, path.join(temp, 'self-diff.png')));
  if (diff.data.changedPixels !== 0) throw new Error('Self visual diff is not zero');
} finally {
  await rm(temp, { recursive: true, force: true });
}
