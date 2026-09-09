import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const base = 'https://acdcleaning.concept-webactueel-7.com';
const outDir = 'results/acd-wprocket-final-qa-20260909';
fs.mkdirSync(outDir, { recursive: true });

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];
const primaryPaths = new Set(['/', '/diensten/', '/zakelijk/', '/particulier/', '/contact/', '/zakelijke-offerte/']);
const formPaths = new Set(['/contact/', '/zakelijke-offerte/']);
const jqueryErrorPattern = /(\$ is not a function|jquery is not defined|uiBackCompat|cannot set properties of undefined.*uiBackCompat)/i;

const slugFromUrl = (url) => {
  const u = new URL(url);
  return (u.pathname === '/' ? 'home' : u.pathname.replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9-]+/gi, '-')) || 'home';
};

async function getPublishedPages() {
  const response = await fetch(`${base}/wp-json/wp/v2/pages?status=publish&per_page=100&_fields=link`);
  if (!response.ok) throw new Error(`Could not fetch published pages: HTTP ${response.status}`);
  const items = await response.json();
  const urls = Array.from(new Set([`${base}/`, ...items.map((item) => item.link)]));
  return urls.sort((a, b) => a.localeCompare(b));
}

async function scrollPage(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let travelled = 0;
      const step = Math.max(400, Math.floor(window.innerHeight * 0.8));
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        travelled += step;
        if (travelled >= Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 60);
    });
  });
  await page.waitForTimeout(350);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
}

async function testMobileMenu(page) {
  const selectors = [
    '.elementor-menu-toggle',
    'button.elementskit-menu-hamburger',
    '.elementskit-menu-hamburger',
    'button[aria-label*="menu" i]',
    '[role="button"][aria-label*="menu" i]',
  ];
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count() && await locator.isVisible().catch(() => false)) {
      const before = await locator.getAttribute('aria-expanded');
      let clicked = false;
      let after = before;
      try {
        await locator.click({ timeout: 4000 });
        clicked = true;
        await page.waitForTimeout(350);
        after = await locator.getAttribute('aria-expanded');
      } catch (error) {
        return { found: true, selector, clicked: false, before, after, error: String(error) };
      }
      const ok = before === 'false' ? after === 'true' : clicked;
      return { found: true, selector, clicked, before, after, ok };
    }
  }
  return { found: false, ok: false };
}

async function runBrowserRound(round, urls) {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const results = [];
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      for (const route of urls) {
        const page = await context.newPage();
        const pageErrors = [];
        const consoleErrors = [];
        const failedRequests = [];
        const failedImages = [];
        page.on('pageerror', (error) => pageErrors.push(String(error?.message || error)));
        page.on('console', (message) => {
          if (message.type() === 'error') consoleErrors.push(message.text());
        });
        page.on('requestfailed', (request) => {
          const type = request.resourceType();
          if (['document', 'script', 'stylesheet', 'image'].includes(type)) {
            failedRequests.push({ type, url: request.url(), error: request.failure()?.errorText || 'failed' });
          }
        });
        page.on('response', (response) => {
          if (response.request().resourceType() === 'image' && response.status() >= 400) {
            failedImages.push({ status: response.status(), url: response.url() });
          }
        });

        const expectedStatus = route.expectedStatus;
        let status = null;
        let navigationError = null;
        try {
          const response = await page.goto(route.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
          status = response?.status() ?? null;
          await page.waitForTimeout(900);
        } catch (error) {
          navigationError = String(error);
        }

        if (!navigationError && expectedStatus === 200) {
          await scrollPage(page);
        }

        const metrics = navigationError ? null : await page.evaluate(() => {
          const root = document.documentElement;
          const body = document.body;
          const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).filter((node) => !!node.href).length;
          const brokenImages = Array.from(document.images)
            .filter((img) => img.complete && !!img.currentSrc && img.naturalWidth === 0)
            .map((img) => img.currentSrc);
          const footer = document.querySelector('footer, [data-elementor-type="footer"], .elementor-location-footer');
          const footerVisible = !!footer && !!(footer.offsetWidth || footer.offsetHeight || footer.getClientRects().length);
          const hasUsedCssMarker = /wpr-usedcss/i.test(document.documentElement.innerHTML) || !!document.querySelector('[id*="wpr-usedcss" i], [class*="wpr-usedcss" i], [data-wpr-usedcss]');
          const forms = document.querySelectorAll('form').length;
          const visibleSubmit = Array.from(document.querySelectorAll('form button[type="submit"], form input[type="submit"]')).some((el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length));
          return {
            readyState: document.readyState,
            clientWidth: root.clientWidth,
            scrollWidth: root.scrollWidth,
            horizontalOverflow: root.scrollWidth > root.clientWidth + 1,
            documentHeight: Math.max(root.scrollHeight, body?.scrollHeight || 0),
            stylesheets,
            brokenImages,
            footerVisible,
            hasUsedCssMarker,
            forms,
            visibleSubmit,
            jqueryType: typeof window.jQuery,
            dollarType: typeof window.$,
          };
        });

        const pathname = new URL(route.url).pathname;
        let menu = null;
        if (!navigationError && expectedStatus === 200 && viewport.name === 'mobile' && primaryPaths.has(pathname)) {
          menu = await testMobileMenu(page);
        }

        if (!navigationError && expectedStatus === 200 && primaryPaths.has(pathname)) {
          const screenshotDir = path.join(outDir, `round-${round}`, viewport.name);
          fs.mkdirSync(screenshotDir, { recursive: true });
          await page.screenshot({ path: path.join(screenshotDir, `${slugFromUrl(route.url)}.png`), fullPage: true });
        }

        const failures = [];
        if (navigationError) failures.push(`navigation:${navigationError}`);
        if (status !== expectedStatus) failures.push(`status:${status}!=${expectedStatus}`);
        if (metrics?.readyState !== 'complete') failures.push(`readyState:${metrics?.readyState}`);
        if (expectedStatus === 200 && metrics?.horizontalOverflow) failures.push('horizontal-overflow');
        if (expectedStatus === 200 && metrics?.hasUsedCssMarker) failures.push('wpr-usedcss-present');
        if (expectedStatus === 200 && metrics?.stylesheets === 0) failures.push('no-stylesheets');
        if (expectedStatus === 200 && metrics?.brokenImages?.length) failures.push(`broken-images:${metrics.brokenImages.length}`);
        if (failedImages.length) failures.push(`image-http-errors:${failedImages.length}`);
        if (pageErrors.length) failures.push(`page-errors:${pageErrors.length}`);
        if (pageErrors.some((message) => jqueryErrorPattern.test(message)) || consoleErrors.some((message) => jqueryErrorPattern.test(message))) {
          failures.push('jquery-runtime-error');
        }
        if (expectedStatus === 200 && formPaths.has(pathname) && (!metrics || metrics.forms < 1 || !metrics.visibleSubmit)) failures.push('form-missing-or-submit-hidden');
        if (expectedStatus === 200 && viewport.name === 'mobile' && primaryPaths.has(pathname) && (!menu?.found || !menu?.ok)) failures.push('mobile-menu-failed');
        if (expectedStatus === 200 && pathname === '/' && !metrics?.footerVisible) failures.push('homepage-footer-not-visible');

        results.push({
          round,
          viewport,
          url: route.url,
          pathname,
          expectedStatus,
          status,
          navigationError,
          metrics,
          menu,
          pageErrors,
          consoleErrors,
          failedRequests,
          failedImages,
          failures,
        });
        await page.close();
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(outDir, `round-${round}.json`), `${JSON.stringify(results, null, 2)}\n`);
  return results;
}

async function runLighthouse(round) {
  const chrome = await chromeLauncher.launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
  });
  try {
    const result = await lighthouse(`${base}/`, {
      port: chrome.port,
      logLevel: 'error',
      output: 'json',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    });
    if (!result) throw new Error('Lighthouse returned no result');
    const audits = result.lhr.audits;
    return {
      round,
      lighthouseVersion: result.lhr.lighthouseVersion,
      finalUrl: result.lhr.finalUrl,
      categories: Object.fromEntries(Object.entries(result.lhr.categories).map(([key, value]) => [key, Math.round((value.score ?? 0) * 100)])),
      metrics: {
        fcp: audits['first-contentful-paint']?.numericValue ?? null,
        lcp: audits['largest-contentful-paint']?.numericValue ?? null,
        cls: audits['cumulative-layout-shift']?.numericValue ?? null,
        tbt: audits['total-blocking-time']?.numericValue ?? null,
        speedIndex: audits['speed-index']?.numericValue ?? null,
      },
    };
  } finally {
    await chrome.kill();
  }
}

const published = await getPublishedPages();
const routes = [
  ...published.map((url) => ({ url, expectedStatus: 200 })),
  { url: `${base}/qa-wp-rocket-404-check-20260909/`, expectedStatus: 404 },
];
const config = {
  base,
  publishedPages: published.length,
  routes: routes.map((route) => ({ url: route.url, expectedStatus: route.expectedStatus })),
  viewports,
  rounds: 2,
  source: {
    controller: 'webactueel-workflow',
    implementationOwner: 'wordpressqualityarchitect',
    qaOwner: 'website-qa-checklist',
    projectId: 'project-plugin',
    sourceSetVersion: '2026-09-08.3-living-master-completion-export',
  },
};
config.configHash = crypto.createHash('sha256').update(JSON.stringify(config)).digest('hex');
fs.writeFileSync(path.join(outDir, 'config.json'), `${JSON.stringify(config, null, 2)}\n`);

const round1 = await runBrowserRound(1, routes);
const lighthouse1 = await runLighthouse(1);
await new Promise((resolve) => setTimeout(resolve, 2500));
const round2 = await runBrowserRound(2, routes);
const lighthouse2 = await runLighthouse(2);

const key = (item) => `${item.viewport.name}|${item.url}`;
const r2Map = new Map(round2.map((item) => [key(item), item]));
const instability = [];
for (const item of round1) {
  const other = r2Map.get(key(item));
  if (!other) {
    instability.push({ key: key(item), issue: 'missing-round-2' });
    continue;
  }
  const signature1 = JSON.stringify({ status: item.status, failures: item.failures, overflow: item.metrics?.horizontalOverflow, usedCss: item.metrics?.hasUsedCssMarker, forms: item.metrics?.forms, menuOk: item.menu?.ok ?? null });
  const signature2 = JSON.stringify({ status: other.status, failures: other.failures, overflow: other.metrics?.horizontalOverflow, usedCss: other.metrics?.hasUsedCssMarker, forms: other.metrics?.forms, menuOk: other.menu?.ok ?? null });
  if (signature1 !== signature2) instability.push({ key: key(item), issue: 'functional-signature-changed', round1: signature1, round2: signature2 });
  if (item.metrics?.documentHeight && other.metrics?.documentHeight) {
    const drift = Math.abs(item.metrics.documentHeight - other.metrics.documentHeight) / Math.max(item.metrics.documentHeight, other.metrics.documentHeight);
    if (drift > 0.10) instability.push({ key: key(item), issue: 'document-height-drift', drift });
  }
}

const allFailures = [...round1, ...round2].filter((item) => item.failures.length > 0).map((item) => ({ round: item.round, viewport: item.viewport.name, url: item.url, failures: item.failures, pageErrors: item.pageErrors }));
const jqueryErrors = [...round1, ...round2].flatMap((item) => [...item.pageErrors, ...item.consoleErrors].filter((message) => jqueryErrorPattern.test(message)).map((message) => ({ round: item.round, viewport: item.viewport.name, url: item.url, message })));
const usedCssHits = [...round1, ...round2].filter((item) => item.metrics?.hasUsedCssMarker).map((item) => ({ round: item.round, viewport: item.viewport.name, url: item.url }));

const report = {
  schemaVersion: 'acd-wprocket-final-qa/1.0',
  generatedAt: new Date().toISOString(),
  config,
  counts: {
    publishedPages: published.length,
    routesPerViewport: routes.length,
    checksPerRound: routes.length * viewports.length,
    totalBrowserChecks: routes.length * viewports.length * 2,
    round1Failures: round1.filter((item) => item.failures.length > 0).length,
    round2Failures: round2.filter((item) => item.failures.length > 0).length,
    jqueryErrors: jqueryErrors.length,
    usedCssHits: usedCssHits.length,
    instability: instability.length,
  },
  lighthouse: [lighthouse1, lighthouse2],
  failures: allFailures,
  jqueryErrors,
  usedCssHits,
  instability,
  stable: allFailures.length === 0 && jqueryErrors.length === 0 && usedCssHits.length === 0 && instability.length === 0,
};
fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!report.stable) process.exitCode = 1;
