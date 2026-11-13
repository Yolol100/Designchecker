#!/usr/bin/env node
// Read-only, public-site responsive observations. No Drive manifest is consumed.
import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';

const requestPath = process.argv[2];
const validateOnly = process.argv.includes('--validate-only');
if (!requestPath || !/^requests\/public-responsive\/[a-zA-Z0-9._-]+\.json$/.test(requestPath)) {
  throw new Error('A scoped requests/public-responsive/<name>.json file is required.');
}
const request = JSON.parse(await fs.readFile(requestPath, 'utf8'));
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{2,79}$/;
const NAME = /^[a-z][a-z0-9-]{2,30}$/;
if (request.schema_version !== 'public-responsive-qa/1' || !ID.test(request.request_id || '')) {
  throw new Error('Invalid request schema or request ID.');
}
const blockedLiteral = (host) => net.isIP(host) !== 0 || /(^localhost$|\.(?:local|localhost|internal|lan|home)$)/i.test(host);
const publicUrl = (value) => {
  const u = new URL(String(value));
  if (u.protocol !== 'https:' || u.username || u.password || u.port || u.search || u.hash || blockedLiteral(u.hostname)) {
    throw new Error('Only public HTTPS URLs without credentials, query, hash or custom ports are accepted.');
  }
  if (/\/(?:wp-admin|wp-json|wp-login\.php|xmlrpc\.php)(?:\/|$)/i.test(u.pathname)) {
    throw new Error('Administrative or API endpoints are not webpage audit targets.');
  }
  return u;
};
const site = publicUrl(request.site);
if (site.pathname !== '/') throw new Error('site must be the public origin root.');
if (!Array.isArray(request.targets) || request.targets.length < 1 || request.targets.length > 30) {
  throw new Error('Target count must be between 1 and 30.');
}
const targets = request.targets.map((entry) => {
  const u = publicUrl(entry.url);
  if (u.origin !== site.origin || !NAME.test(entry.slug || '')) throw new Error('Unsafe URL origin or slug.');
  return { url: u.href, slug: entry.slug };
});
if (new Set(targets.map((x) => x.url)).size !== targets.length || new Set(targets.map((x) => x.slug)).size !== targets.length) {
  throw new Error('Duplicate target URL or slug.');
}
const viewports = request.viewports;
if (!Array.isArray(viewports) || viewports.length < 3 || viewports.length > 6) throw new Error('Expected 3-6 viewports.');
for (const p of viewports) {
  if (!NAME.test(p.name || '') || !Number.isInteger(p.width) || p.width < 320 || p.width > 1600 ||
      !Number.isInteger(p.height) || p.height < 600 || p.height > 1600) throw new Error('Invalid viewport.');
}
if (new Set(viewports.map((p) => p.name)).size !== viewports.length) throw new Error('Duplicate viewport name.');
const screenshotViews = Array.isArray(request.screenshot_viewports) ? request.screenshot_viewports : [];
if (screenshotViews.length > 3 || screenshotViews.some((name) => !viewports.some((p) => p.name === name))) {
  throw new Error('Screenshots can be collected for at most three declared viewports.');
}
const samples = request.axe_viewports || [];
if (!Array.isArray(samples) || samples.length > 2 || samples.some((name) => !viewports.some((p) => p.name === name))) {
  throw new Error('Accessibility samples must refer to at most two declared viewports.');
}
if (validateOnly) {
  console.log(JSON.stringify({ valid: true, request_id: request.request_id, targets: targets.length, viewports: viewports.length }));
  process.exit(0);
}
// The DNS-pinned proxy independently rejects private/reserved IP addresses on all network requests.
const { assertPublicUrl, isBlockedHostnameLiteral } = await import('../legacy/checklist/src/net.js');
const { startPublicNetworkProxy } = await import('../legacy/checklist/src/public-proxy.js');
const { chromium } = await import('playwright');
const { default: axe } = await import('axe-core');
await assertPublicUrl(site, { allowQuery: false });
for (const target of targets) await assertPublicUrl(target.url, { allowQuery: false });
const output = path.join('results', 'public-responsive', request.request_id);
await fs.mkdir(output, { recursive: true });
const results = [];
const proxy = await startPublicNetworkProxy();
let browser;
const started_at = new Date().toISOString();
const report = async () => {
  const payload = {
    schema_version: 'public-responsive-evidence/1', request_id: request.request_id,
    site: site.href, execution: 'github-actions / Playwright Chromium / synthetic',
    started_at, updated_at: new Date().toISOString(),
    expected: targets.length * viewports.length, observed: results.filter((r) => r.outcome === 'observed').length,
    errors: results.filter((r) => r.outcome !== 'observed').length,
    limitations: ['No real phone or tablet hardware', 'No live form submission', 'Automated axe is not WCAG certification', 'Screenshots need manual interpretation'],
    results
  };
  await fs.writeFile(path.join(output, 'audit.json'), JSON.stringify(payload, null, 2));
  const esc = (x) => '"' + String(x ?? '').replaceAll('"', '""') + '"';
  const columns = ['slug', 'url', 'viewport', 'width', 'outcome', 'http_status', 'horizontal_overflow', 'broken_images', 'page_error_count', 'a11y_violations', 'signals'];
  const csv = [columns.join(','), ...results.map((r) => [r.slug, r.url, r.viewport, r.width, r.outcome,
    r.http_status, r.horizontal_overflow, r.broken_images, r.page_error_count,
    r.a11y_violations, (r.signals || []).join(' | ')].map(esc).join(','))].join('\n') + '\n';
  await fs.writeFile(path.join(output, 'audit.csv'), csv);
};
try {
  browser = await chromium.launch({ headless: true, proxy: { server: proxy.url }, args: ['--disable-quic', '--force-webrtc-ip-handling-policy=disable_non_proxied_udp'] });
  for (const target of targets) {
    for (const viewport of viewports) {
      const item = { slug: target.slug, url: target.url, viewport: viewport.name, width: viewport.width,
        height: viewport.height, outcome: 'not_run', http_status: null, horizontal_overflow: null,
        broken_images: null, page_error_count: 0, a11y_violations: null, signals: [] };
      let context;
      try {
        context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height },
          reducedMotion: 'reduce', serviceWorkers: 'block', locale: 'en-GB' });
        let blockedWrites = 0;
        await context.route('**/*', async (route) => {
          const req = route.request();
          let u;
          try { u = new URL(req.url()); } catch { await route.abort('blockedbyclient'); return; }
          if (!['GET', 'HEAD'].includes(req.method().toUpperCase())) {
            blockedWrites += 1;
            await route.abort('blockedbyclient'); return;
          }
          if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password || u.port || blockedLiteral(u.hostname)) {
            await route.abort('blockedbyclient'); return;
          }
          await route.continue(); // the DNS-pinned proxy enforces public-IP-only egress
        });
        await context.routeWebSocket('**/*', (route) => route.close());
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (e) => errors.push(e?.name || 'pageerror'));
        const response = await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        item.http_status = response?.status() || null;
        await page.locator('body').waitFor({ state: 'visible', timeout: 8_000 });
        await page.waitForTimeout(350);
        const dom = await page.evaluate(() => {
          const viewportWidth = document.documentElement.clientWidth;
          const scrollWidth = document.documentElement.scrollWidth;
          const brokenImages = [...document.images].filter((img) => img.complete && img.naturalWidth === 0).length;
          const visibleMenuButtons = [...document.querySelectorAll('button.elementor-menu-toggle, button.menu-toggle, button[aria-label*="menu" i]')]
            .filter((x) => x.getClientRects().length).length;
          const widest = [...document.querySelectorAll('body *')].filter((el) => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.right > viewportWidth + 3 && getComputedStyle(el).position !== 'fixed';
          }).slice(0, 4).map((el) => ({ tag: el.tagName, right: Math.round(el.getBoundingClientRect().right) }));
          return { viewportWidth, scrollWidth, horizontalOverflow: scrollWidth > viewportWidth + 2,
            brokenImages, h1Count: document.querySelectorAll('h1').length,
            formCount: document.querySelectorAll('form').length, visibleMenuButtons, widest };
        });
        item.horizontal_overflow = dom.horizontalOverflow;
        item.scroll_width = dom.scrollWidth;
        item.broken_images = dom.brokenImages;
        item.h1_count = dom.h1Count;
        item.form_count = dom.formCount;
        item.visible_menu_buttons = dom.visibleMenuButtons;
        item.overflow_elements = dom.widest;
        item.page_error_count = errors.length;
        item.blocked_write_requests = blockedWrites;
        if (item.http_status >= 400 || item.http_status === null) item.signals.push('HTTP error');
        if (dom.horizontalOverflow) item.signals.push('horizontal overflow');
        if (dom.brokenImages) item.signals.push('broken images');
        if (errors.length) item.signals.push('JavaScript page errors');
        if (blockedWrites) item.signals.push('page attempted blocked non-GET/HEAD requests');
        if (samples.includes(viewport.name)) {
          await page.addScriptTag({ content: axe.source });
          const a11y = await page.evaluate(async () => window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }));
          item.a11y_violations = a11y.violations.length;
          item.a11y_issues = a11y.violations.slice(0, 12).map((v) => ({ rule: v.id, impact: v.impact, nodes: v.nodes.length }));
          if (item.a11y_violations) item.signals.push('automated accessibility warnings');
        }
        if (screenshotViews.includes(viewport.name)) {
          const name = `${target.slug}-${viewport.name}.png`;
          const relative = path.join('screenshots', name);
          await fs.mkdir(path.join(output, 'screenshots'), { recursive: true });
          await page.screenshot({ path: path.join(output, relative), fullPage: true, animations: 'disabled', timeout: 20_000 });
          item.screenshot = relative;
        }
        item.outcome = item.http_status && item.http_status < 400 ? 'observed' : 'error';
      } catch (error) {
        item.outcome = 'error';
        item.signals.push('browser execution error');
        item.error_type = error?.name || 'Error';
      } finally {
        await context?.close().catch(() => {});
      }
      results.push(item);
      if (results.length % 6 === 0) await report();
      console.log(`${results.length}/${targets.length * viewports.length} ${target.slug} ${viewport.name} ${item.outcome}`);
    }
  }
} finally {
  await report();
  await browser?.close().catch(() => {});
  await proxy.close().catch(() => {});
}
const failed = results.filter((x) => x.outcome !== 'observed');
console.log(JSON.stringify({ request_id: request.request_id, observed: results.length - failed.length,
  expected: targets.length * viewports.length, browser_errors: failed.length }));
if (failed.length) process.exitCode = 2;