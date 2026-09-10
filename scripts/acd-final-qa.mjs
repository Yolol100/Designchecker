#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const request = JSON.parse(fs.readFileSync('requests/acd-final-qa.json', 'utf8'));
const base = String(request.target).replace(/\/$/, '');
const round = String(request.round || 'unknown');
const removedSlugs = ['fullservice-carwash','fotostudio-auto','klein-schadeherstel','carwash-progamma','service'];
const outputDir = path.join('results', 'acd-final-qa');
fs.mkdirSync(outputDir, { recursive: true });

const api = await fetch(`${base}/wp-json/wp/v2/pages?per_page=100&status=publish&_fields=id,link,slug`);
if (!api.ok) throw new Error(`Page inventory failed: ${api.status}`);
const pages = await api.json();
if (!Array.isArray(pages) || pages.length === 0) throw new Error('No published pages returned.');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const results = [];

for (const item of pages) {
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];
  const badResponses = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('requestfailed', r => failedRequests.push({ url: r.url(), error: r.failure()?.errorText || null }));
  page.on('response', r => { if (r.status() >= 400) badResponses.push({ url: r.url(), status: r.status(), type: r.request().resourceType() }); });

  let nav = null;
  try {
    nav = await page.goto(item.link, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(750);
  } catch (e) {
    pageErrors.push(`NAV ${e.message}`);
  }

  const headings = await page.locator('h1,h2,h3,h4,h5,h6').evaluateAll(nodes => nodes.map(n => ({ level: Number(n.tagName.slice(1)), text: (n.textContent || '').trim() })));
  const headingSkips = [];
  for (let i = 1; i < headings.length; i++) {
    if (headings[i].level > headings[i - 1].level + 1) headingSkips.push({ from: headings[i - 1], to: headings[i] });
  }
  const mainCount = await page.locator('main').count();
  const h1Count = await page.locator('h1').count();
  const forms = await page.locator('form').count();
  const jqueryScripts = await page.locator('script[src*="jquery"]').evaluateAll(nodes => nodes.map(n => ({ id: n.id || '', src: n.src, defer: n.hasAttribute('defer'), rocketDefer: n.hasAttribute('data-rocket-defer') })));
  const protectedJquery = jqueryScripts.filter(s => ['jquery-core-js','jquery-migrate-js','jquery-ui-core-js'].includes(s.id));
  const deferredProtectedJquery = protectedJquery.filter(s => s.defer || s.rocketDefer);
  const headers = nav ? await nav.allHeaders() : {};
  const security = {
    hsts: headers['strict-transport-security'] || null,
    xPoweredBy: headers['x-powered-by'] || null,
    xFrameOptions: headers['x-frame-options'] || null,
    xContentTypeOptions: headers['x-content-type-options'] || null,
    referrerPolicy: headers['referrer-policy'] || null,
    permissionsPolicy: headers['permissions-policy'] || null,
    contentSecurityPolicy: headers['content-security-policy'] || null,
  };

  results.push({
    id: item.id,
    slug: item.slug,
    url: item.link,
    status: nav?.status() || 0,
    mainCount,
    h1Count,
    headingSkips,
    formsObservedOnly: forms,
    pageErrors,
    consoleErrors,
    failedRequests,
    badResponses,
    protectedJquery,
    deferredProtectedJquery,
    security,
  });
  await page.close();
}

const removedRoutes = {};
for (const slug of removedSlugs) {
  const response = await context.request.get(`${base}/${slug}/`, { maxRedirects: 0, failOnStatusCode: false });
  removedRoutes[slug] = { status: response.status(), location: response.headers()['location'] || null };
}

await context.close();
await browser.close();

const issues = [];
for (const r of results) {
  if (r.status !== 200) issues.push(`${r.slug}: status ${r.status}`);
  if (r.mainCount !== 1) issues.push(`${r.slug}: mainCount ${r.mainCount}`);
  if (r.h1Count !== 1) issues.push(`${r.slug}: h1Count ${r.h1Count}`);
  if (r.headingSkips.length) issues.push(`${r.slug}: heading skips ${r.headingSkips.length}`);
  if (r.pageErrors.length) issues.push(`${r.slug}: page errors ${r.pageErrors.length}`);
  if (r.consoleErrors.length) issues.push(`${r.slug}: console errors ${r.consoleErrors.length}`);
  if (r.failedRequests.length) issues.push(`${r.slug}: failed requests ${r.failedRequests.length}`);
  if (r.badResponses.length) issues.push(`${r.slug}: 4xx/5xx assets ${r.badResponses.length}`);
  if (r.deferredProtectedJquery.length) issues.push(`${r.slug}: protected jQuery deferred ${r.deferredProtectedJquery.map(x => x.id).join(',')}`);
  if (!r.security.hsts) issues.push(`${r.slug}: HSTS missing`);
  if (r.security.xPoweredBy) issues.push(`${r.slug}: X-Powered-By exposed`);
  if (r.security.xFrameOptions !== 'SAMEORIGIN') issues.push(`${r.slug}: X-Frame-Options unexpected`);
  if (r.security.xContentTypeOptions !== 'nosniff') issues.push(`${r.slug}: X-Content-Type-Options unexpected`);
  if (r.security.referrerPolicy !== 'strict-origin-when-cross-origin') issues.push(`${r.slug}: Referrer-Policy unexpected`);
  if (!r.security.permissionsPolicy?.includes('camera=()') || !r.security.permissionsPolicy?.includes('microphone=()')) issues.push(`${r.slug}: Permissions-Policy unexpected`);
}
for (const [slug, r] of Object.entries(removedRoutes)) {
  if (r.status !== 404) issues.push(`removed ${slug}: expected 404, got ${r.status}`);
}

const summary = {
  round,
  publishedPages: results.length,
  pages200: results.filter(r => r.status === 200).length,
  pagesWithExactlyOneMain: results.filter(r => r.mainCount === 1).length,
  pagesWithExactlyOneH1: results.filter(r => r.h1Count === 1).length,
  totalHeadingSkips: results.reduce((n, r) => n + r.headingSkips.length, 0),
  totalPageErrors: results.reduce((n, r) => n + r.pageErrors.length, 0),
  totalConsoleErrors: results.reduce((n, r) => n + r.consoleErrors.length, 0),
  totalFailedRequests: results.reduce((n, r) => n + r.failedRequests.length, 0),
  totalBadResponses: results.reduce((n, r) => n + r.badResponses.length, 0),
  pagesWithDeferredProtectedJquery: results.filter(r => r.deferredProtectedJquery.length).length,
  pagesWithSecurityHeaderFailures: results.filter(r => !r.security.hsts || r.security.xPoweredBy || r.security.xFrameOptions !== 'SAMEORIGIN' || r.security.xContentTypeOptions !== 'nosniff' || r.security.referrerPolicy !== 'strict-origin-when-cross-origin' || !r.security.permissionsPolicy?.includes('camera=()') || !r.security.permissionsPolicy?.includes('microphone=()')).length,
  removedRoutes,
  issueCount: issues.length,
};

const output = {
  schema_version: 'acd-final-qa/1.0',
  request: { target: base, round, formsPolicy: 'observe-only; never submit' },
  generated_at: new Date().toISOString(),
  summary,
  issues,
  pages: results,
};
fs.writeFileSync(path.join(outputDir, `round-${round}.json`), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
if (issues.length) process.exit(1);
