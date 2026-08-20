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
      await installNetworkGuard(page);
      await page.goto(url.toString(), { waitUntil: 'networkidle', timeout: 45000 });
      assertSafeTarget(page.url());
      const file = path.join(outputDir, `${viewport.name}-${viewport.width}x${viewport.height}.png`);
      await page.screenshot({ path: file, fullPage: true, ...STABLE_SCREENSHOT_OPTIONS });
      const state = await page.evaluate(() => ({ title: document.title, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, activeElement: document.activeElement?.tagName ?? null }));
      captures.push({ viewport, file, state });
      await context.close();
    }
  } finally {
    await browser.close();
  }
  return evidence({ owner, tool: toolName, target, data: { outputDir, captures, screenshotStability: STABLE_SCREENSHOT_OPTIONS }, limits: ['Screenshot baseline is controlled-runtime evidence; interaction and assistive-technology behavior remain separate tests.', SCREENSHOT_STABILITY_NOTE] });
}
