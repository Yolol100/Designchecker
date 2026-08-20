import pixelmatch from 'pixelmatch';
import sharp from 'sharp';
import { evidence } from '../core/evidence.js';
import type { Owner } from '../core/types.js';

export const VISUAL_DIFF_POLICY = Object.freeze({
  algorithm: 'pixelmatch',
  threshold: 0.1,
});

export async function compareScreenshots(beforePath: string, afterPath: string, diffPath: string, owner: Owner = 'design', toolName = 'design_compare_screenshots') {
  const before = await sharp(beforePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const after = await sharp(afterPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (before.info.width !== after.info.width || before.info.height !== after.info.height) throw new Error(`Image dimensions differ: ${before.info.width}x${before.info.height} vs ${after.info.width}x${after.info.height}.`);
  const { width, height } = before.info;
  const diff = Buffer.alloc(width * height * 4);
  const changedPixels = pixelmatch(before.data, after.data, diff, width, height, { threshold: VISUAL_DIFF_POLICY.threshold });
  await sharp(diff, { raw: { width, height, channels: 4 } }).png().toFile(diffPath);
  return evidence({ owner, tool: toolName, evidenceLevel: 'source', data: { beforePath, afterPath, diffPath, width, height, changedPixels, changedRatio: changedPixels / (width * height), comparisonPolicy: VISUAL_DIFF_POLICY }, limits: ['Pixel difference detects visual change, not whether the change is intended, accessible or better for users.'] });
}
