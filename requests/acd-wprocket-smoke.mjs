import { chromium } from 'playwright';

const base = 'https://acdcleaning.concept-webactueel-7.com';
const pages = ['/', '/diensten/', '/zakelijk/', '/particulier/', '/contact/', '/zakelijke-offerte/'];
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];
const jqueryPattern = /(\$ is not a function|jquery is not defined|uiBackCompat|cannot set properties of undefined.*uiBackCompat)/i;
const results = [];
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    for (const pathname of pages) {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(String(error?.message || error)));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      const response = await page.goto(`${base}${pathname}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(1200);
      await page.evaluate(async () => {
        const max = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
        for (let y = 0; y < max; y += Math.max(500, window.innerHeight * 0.8)) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 50));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(250);
      const state = await page.evaluate(() => ({
        readyState: document.readyState,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        usedCss: /wpr-usedcss/i.test(document.documentElement.innerHTML) || !!document.querySelector('[id*="wpr-usedcss" i], [class*="wpr-usedcss" i], [data-wpr-usedcss]'),
        stylesheets: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).filter((node) => !!node.href).length,
        brokenImages: Array.from(document.images).filter((img) => img.complete && !!img.currentSrc && img.naturalWidth === 0).length,
        forms: document.querySelectorAll('form').length,
        footerVisible: !!document.querySelector('footer, [data-elementor-type="footer"], .elementor-location-footer'),
      }));
      let menu = { needed: viewport.name === 'mobile', found: false, ok: viewport.name !== 'mobile' };
      if (viewport.name === 'mobile') {
        for (const selector of ['.elementor-menu-toggle','button.elementskit-menu-hamburger','.elementskit-menu-hamburger','button[aria-label*="menu" i]']) {
          const el = page.locator(selector).first();
          if (await el.count() && await el.isVisible().catch(() => false)) {
            menu.found = true;
            const before = await el.getAttribute('aria-expanded');
            await el.click({ timeout: 4000 });
            await page.waitForTimeout(300);
            const after = await el.getAttribute('aria-expanded');
            menu.ok = before === 'false' ? after === 'true' : true;
            menu.before = before;
            menu.after = after;
            menu.selector = selector;
            break;
          }
        }
      }
      const failures = [];
      if (response?.status() !== 200) failures.push(`status:${response?.status()}`);
      if (state.readyState !== 'complete') failures.push(`ready:${state.readyState}`);
      if (state.overflow) failures.push('overflow');
      if (state.usedCss) failures.push('used-css');
      if (state.stylesheets < 1) failures.push('no-stylesheets');
      if (state.brokenImages) failures.push(`broken-images:${state.brokenImages}`);
      if (errors.some((e) => jqueryPattern.test(e))) failures.push('jquery-runtime-error');
      if ((pathname === '/contact/' || pathname === '/zakelijke-offerte/') && state.forms < 1) failures.push('form-missing');
      if (pathname === '/' && !state.footerVisible) failures.push('footer-missing');
      if (!menu.ok) failures.push('mobile-menu');
      results.push({ viewport: viewport.name, pathname, status: response?.status(), state, menu, errors, failures });
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
}
const failed = results.filter((r) => r.failures.length);
console.log(JSON.stringify({ total: results.length, failures: failed.length, failed, results }, null, 2));
if (failed.length) process.exitCode = 1;
