import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { evidence } from '../core/evidence.js';
import { STABLE_SCREENSHOT_OPTIONS, SCREENSHOT_STABILITY_NOTE } from '../core/screenshot.js';
import { assertSafeTarget } from '../core/url.js';
import { installNetworkGuard, withPage } from '../core/browser.js';
import type { Owner, ViewportSpec } from '../core/types.js';

const DEFAULT_VIEWPORTS: ViewportSpec[] = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 }
];

export async function inspectDesign(target: string, owner: Owner = 'design', toolName = 'design_inspect_page') {
  const data = await withPage(target, {}, async (page) => page.evaluate(() => {
    const rootStyle = getComputedStyle(document.documentElement);
    const rootVars: Record<string, string> = {};
    for (let i = 0; i < rootStyle.length; i += 1) {
      const key = rootStyle.item(i);
      if (key.startsWith('--')) rootVars[key] = rootStyle.getPropertyValue(key).trim();
    }
    const visible = (el: Element) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(visible).slice(0, 80).map((el) => ({ level: Number(el.tagName.slice(1)), text: (el.textContent ?? '').trim().slice(0, 160) }));
    const buttons = [...document.querySelectorAll('button,a,[role="button"]')].filter(visible).slice(0, 80).map((el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return { tag: el.tagName.toLowerCase(), text: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 100), width: Math.round(rect.width), height: Math.round(rect.height), fontSize: style.fontSize, borderRadius: style.borderRadius, backgroundColor: style.backgroundColor, color: style.color };
    });
    const forms = [...document.querySelectorAll('form')].slice(0, 20).map((form) => ({ fields: form.querySelectorAll('input,select,textarea').length, requiredFields: form.querySelectorAll('[required]').length, submitControls: form.querySelectorAll('button[type="submit"],input[type="submit"]').length }));
    const body = getComputedStyle(document.body);
    return {
      title: document.title,
      language: document.documentElement.lang || null,
      rootCssVariableCount: Object.keys(rootVars).length,
      rootCssVariables: Object.fromEntries(Object.entries(rootVars).slice(0, 150)),
      body: { fontFamily: body.fontFamily, fontSize: body.fontSize, lineHeight: body.lineHeight, color: body.color, backgroundColor: body.backgroundColor },
      headings, buttons, forms,
      counts: { links: document.querySelectorAll('a[href]').length, images: document.images.length, dialogs: document.querySelectorAll('dialog,[role="dialog"]').length, landmarks: document.querySelectorAll('main,nav,header,footer,aside,[role="main"],[role="navigation"]').length },
      viewport: { width: innerWidth, height: innerHeight },
      documentSize: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1
    };
  }));
  return evidence({ owner, tool: toolName, target, data, limits: ['Rendered-page inspection only.', 'Does not prove usability, conversion uplift, WCAG conformance, or correct behavior on all states/devices.'] });
}

export async function captureDesignBaseline(target: string, outputDir: string, viewports = DEFAULT_VIEWPORTS, owner: Owner = 'design', toolName = 'design_capture_baseline') {
  const url = assertSafeTarget(target);
  await mkdir(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const captures: Array<Record<string, unknown>> = [];
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      const failedRequests: Array<{ url: string; failure: string | null }> = [];
      const badResponses: Array<{ url: string; status: number }> = [];

      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 1000));
      });
      page.on('pageerror', (error) => pageErrors.push((error.stack ?? error.message).slice(0, 2000)));
      page.on('requestfailed', (request) => failedRequests.push({ url: request.url().slice(0, 500), failure: request.failure()?.errorText ?? null }));
      page.on('response', (response) => {
        if (response.status() >= 400) badResponses.push({ url: response.url().slice(0, 500), status: response.status() });
      });

      await installNetworkGuard(page);
      const response = await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForLoadState('load', { timeout: 15000 }).catch(() => undefined);
      await page.waitForTimeout(3000);
      await page.evaluate(async () => {
        const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
        if (fonts) await fonts.ready;
      });
      assertSafeTarget(page.url());

      const file = path.join(outputDir, `${viewport.name}-${viewport.width}x${viewport.height}.png`);
      await page.screenshot({ path: file, fullPage: true, ...STABLE_SCREENSHOT_OPTIONS });
      const state = await page.evaluate(() => ({
        title: document.title,
        readyState: document.readyState,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
        activeElement: document.activeElement?.tagName ?? null,
        imageCount: document.images.length,
        imagesComplete: [...document.images].filter((image) => image.complete).length,
        links: document.querySelectorAll('a[href]').length,
        forms: document.querySelectorAll('form').length,
        stylesheets: document.querySelectorAll('link[rel="stylesheet"]').length,
        inlineStyles: document.querySelectorAll('style').length,
        delayedRocketScripts: document.querySelectorAll('script[type="rocketlazyloadscript"]').length,
        lazyImages: document.querySelectorAll('img[data-lazy-src],img[loading="lazy"]').length
      }));

      const html = await page.content();
      const optimizationMarkers = {
        wpRocketFootprint: html.includes('Performance optimized by WP Rocket'),
        wprUsedCss: html.includes('id="wpr-usedcss"'),
        rocketLazyScript: html.includes('rocketlazyloadscript'),
        assetCleanupMention: /asset[ -]?clean[ -]?up/i.test(html)
      };

      let menuTest: Record<string, unknown> = { attempted: false };
      if (viewport.width <= 480) {
        const toggle = page.locator('.elementor-menu-toggle, .elementskit-menu-hamburger, button[aria-label*="menu" i]').first();
        const visible = await toggle.isVisible().catch(() => false);
        if (visible) {
          const before = await toggle.getAttribute('aria-expanded').catch(() => null);
          try {
            await toggle.click({ timeout: 3000 });
            await page.waitForTimeout(300);
            const after = await toggle.getAttribute('aria-expanded').catch(() => null);
            menuTest = { attempted: true, visible: true, clickSucceeded: true, ariaExpandedBefore: before, ariaExpandedAfter: after };
            await toggle.click({ timeout: 3000 }).catch(() => undefined);
          } catch (error) {
            menuTest = { attempted: true, visible: true, clickSucceeded: false, error: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500) };
          }
        } else {
          menuTest = { attempted: true, visible: false };
        }
      }

      let accordionTest: Record<string, unknown> = { attempted: false };
      const accordion = page.locator('.elementor-accordion-title, .e-n-accordion-item-title, .ekit-accordion--toggler, details > summary').first();
      const accordionVisible = await accordion.isVisible().catch(() => false);
      if (accordionVisible) {
        const before = await accordion.evaluate((element) => ({
          ariaExpanded: element.getAttribute('aria-expanded'),
          detailsOpen: element.parentElement?.tagName === 'DETAILS' ? (element.parentElement as HTMLDetailsElement).open : null
        })).catch(() => ({ ariaExpanded: null, detailsOpen: null }));
        try {
          await accordion.click({ timeout: 3000 });
          await page.waitForTimeout(300);
          const after = await accordion.evaluate((element) => ({
            ariaExpanded: element.getAttribute('aria-expanded'),
            detailsOpen: element.parentElement?.tagName === 'DETAILS' ? (element.parentElement as HTMLDetailsElement).open : null
          })).catch(() => ({ ariaExpanded: null, detailsOpen: null }));
          accordionTest = { attempted: true, visible: true, clickSucceeded: true, before, after };
          await accordion.click({ timeout: 3000 }).catch(() => undefined);
        } catch (error) {
          accordionTest = { attempted: true, visible: true, clickSucceeded: false, error: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500) };
        }
      }

      captures.push({
        viewport,
        file,
        response: { status: response?.status() ?? null, ok: response?.ok() ?? null, finalUrl: page.url() },
        state,
        optimizationMarkers,
        menuTest,
        accordionTest,
        consoleErrors: consoleErrors.slice(0, 20),
        pageErrors: pageErrors.slice(0, 20),
        failedRequests: failedRequests.slice(0, 20),
        badResponses: badResponses.slice(0, 20)
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }
  return evidence({ owner, tool: toolName, target, data: { outputDir, captures, screenshotStability: STABLE_SCREENSHOT_OPTIONS, navigationStrategy: 'domcontentloaded + load<=15s + 3s settle + document.fonts.ready' }, limits: ['Screenshot baseline is controlled-runtime evidence; interaction and assistive-technology behavior remain separate tests.', SCREENSHOT_STABILITY_NOTE] });
}
