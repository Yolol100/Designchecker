import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { chromium } from 'playwright';
import { evidence } from '../core/evidence.js';
import { assertPublicTarget } from '../core/url.js';
import type { Owner } from '../core/types.js';

export async function runLighthouse(target: string, owner: Owner = 'website-qa-checklist', toolName = 'performance_lighthouse') {
  const url = await assertPublicTarget(target);
  const chrome = await chromeLauncher.launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'] });
  try {
    const result = await lighthouse(url.toString(), { port: chrome.port, logLevel: 'error', output: 'json', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] });
    if (!result) throw new Error('Lighthouse returned no result.');
    const finalUrl = result.lhr.finalUrl ?? url.toString();
    await assertPublicTarget(finalUrl);
    const categories = Object.fromEntries(Object.entries(result.lhr.categories).map(([key, value]) => [key, Math.round((value.score ?? 0) * 100)]));
    const audits = result.lhr.audits;
    return evidence({ owner, tool: toolName, target, data: { categories, metrics: { fcp: audits['first-contentful-paint']?.numericValue ?? null, lcp: audits['largest-contentful-paint']?.numericValue ?? null, cls: audits['cumulative-layout-shift']?.numericValue ?? null, tbt: audits['total-blocking-time']?.numericValue ?? null, speedIndex: audits['speed-index']?.numericValue ?? null }, finalUrl, lighthouseVersion: result.lhr.lighthouseVersion }, limits: ['Lighthouse is a lab run. It is not field Core Web Vitals and does not prove production performance for all users. Initial and final URL hostnames are checked against blocked address ranges; client-side navigation remains a lab-runtime limitation.'] });
  } finally {
    await chrome.kill();
  }
}
