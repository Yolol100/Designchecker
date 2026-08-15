import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { chromium } from 'playwright';
import { evidence } from '../core/evidence.js';
import { assertSafeTarget } from '../core/url.js';

export async function runLighthouse(target: string) {
  const url = assertSafeTarget(target);
  const chrome = await chromeLauncher.launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'] });
  try {
    const result = await lighthouse(url.toString(), { port: chrome.port, logLevel: 'error', output: 'json', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] });
    if (!result) throw new Error('Lighthouse returned no result.');
    const categories = Object.fromEntries(Object.entries(result.lhr.categories).map(([key, value]) => [key, Math.round((value.score ?? 0) * 100)]));
    const audits = result.lhr.audits;
    return evidence({ owner: 'website-qa-checklist', tool: 'performance_lighthouse', target, data: { categories, metrics: { fcp: audits['first-contentful-paint']?.numericValue ?? null, lcp: audits['largest-contentful-paint']?.numericValue ?? null, cls: audits['cumulative-layout-shift']?.numericValue ?? null, tbt: audits['total-blocking-time']?.numericValue ?? null, speedIndex: audits['speed-index']?.numericValue ?? null }, finalUrl: result.lhr.finalUrl, lighthouseVersion: result.lhr.lighthouseVersion }, limits: ['Lighthouse is a lab run. It is not field Core Web Vitals and does not prove production performance for all users.'] });
  } finally {
    await chrome.kill();
  }
}
