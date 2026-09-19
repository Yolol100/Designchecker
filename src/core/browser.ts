import { chromium, type Browser, type Page } from 'playwright';
import { assertPublicTarget } from './url.js';

export const VISUAL_READINESS_POLICY = {
  navigation: 'domcontentloaded',
  body: 'visible',
  load: 'best-effort',
  fonts: 'ready',
  animationFrames: 2,
  lazyContentHydration: 'opt-in-scroll-pass'
} as const;

export function isReadOnlyNetworkMethod(method: string): boolean {
  return method.toUpperCase() === 'GET' || method.toUpperCase() === 'HEAD';
}

export async function installNetworkGuard(page: Page): Promise<void> {
  const checkedHosts = new Map<string, Promise<void>>();
  await page.route('**/*', async (route) => {
    const request = route.request();
    const requestUrl = request.url();
    try {
      if (!isReadOnlyNetworkMethod(request.method())) {
        await route.abort('blockedbyclient');
        return;
      }

      const parsed = new URL(requestUrl);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        const key = `${parsed.protocol}//${parsed.host}`;
        let check = checkedHosts.get(key);
        if (!check) {
          check = assertPublicTarget(requestUrl).then(() => undefined);
          checkedHosts.set(key, check);
        }
        await check;
      }
      await route.continue();
    } catch {
      await route.abort('blockedbyclient');
    }
  });
}

export async function waitForVisualReadiness(page: Page): Promise<void> {
  await page.locator('body').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForLoadState('load', { timeout: 15000 }).catch(() => undefined);
  await page.evaluate(async () => {
    const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
    if (fonts) await fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
}

export async function navigateReadOnlyPage(page: Page, target: string): Promise<void> {
  await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitForVisualReadiness(page);
}

export async function hydrateLazyContentForVisualCapture(page: Page): Promise<Record<string, number>> {
  const before = await page.evaluate(() => ({
    scrollHeight: document.scrollingElement?.scrollHeight ?? document.documentElement.scrollHeight,
    imageCount: document.images.length,
    incompleteImageCount: [...document.images].filter((img) => !img.complete || img.naturalWidth === 0).length
  }));

  let passes = 0;
  let scrollSteps = 0;
  let previousHeight = before.scrollHeight;

  for (let pass = 0; pass < 3; pass += 1) {
    passes += 1;
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(75);

    for (let step = 0; step < 160; step += 1) {
      const state = await page.evaluate(() => {
        const root = document.scrollingElement ?? document.documentElement;
        const viewport = Math.max(window.innerHeight, 1);
        const maxY = Math.max(0, root.scrollHeight - viewport);
        const currentY = Math.max(0, window.scrollY);
        const nextY = Math.min(maxY, currentY + Math.max(320, Math.floor(viewport * 0.8)));
        window.scrollTo(0, nextY);
        return { nextY, maxY, scrollHeight: root.scrollHeight };
      });
      scrollSteps += 1;
      await page.waitForTimeout(90);

      if (state.nextY >= state.maxY) {
        await page.waitForTimeout(250);
        const expandedHeight = await page.evaluate(
          () => document.scrollingElement?.scrollHeight ?? document.documentElement.scrollHeight
        );
        if (expandedHeight <= state.scrollHeight + 1) break;
      }
    }

    const currentHeight = await page.evaluate(
      () => document.scrollingElement?.scrollHeight ?? document.documentElement.scrollHeight
    );
    if (currentHeight <= previousHeight + 1) break;
    previousHeight = currentHeight;
  }

  await page.evaluate(() => {
    const root = document.scrollingElement ?? document.documentElement;
    root.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo(0, 0);
    window.dispatchEvent(new Event('scroll'));
  });
  await page.waitForTimeout(350);
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });

  const after = await page.evaluate(() => ({
    scrollHeight: document.scrollingElement?.scrollHeight ?? document.documentElement.scrollHeight,
    imageCount: document.images.length,
    incompleteImageCount: [...document.images].filter((img) => !img.complete || img.naturalWidth === 0).length,
    scrollY: window.scrollY
  }));

  return {
    passes,
    scrollSteps,
    initialScrollHeight: before.scrollHeight,
    finalScrollHeight: after.scrollHeight,
    initialImageCount: before.imageCount,
    finalImageCount: after.imageCount,
    initialIncompleteImageCount: before.incompleteImageCount,
    finalIncompleteImageCount: after.incompleteImageCount,
    finalScrollY: after.scrollY
  };
}


export async function withPage<T>(
  target: string,
  options: { width?: number; height?: number; bypassCSP?: boolean } = {},
  run: (page: Page) => Promise<T>
): Promise<T> {
  const url = await assertPublicTarget(target);
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: options.width ?? 1440, height: options.height ?? 1000 },
      reducedMotion: 'reduce',
      bypassCSP: options.bypassCSP ?? false
    });
    const page = await context.newPage();
    await installNetworkGuard(page);
    await navigateReadOnlyPage(page, url.toString());
    await assertPublicTarget(page.url());
    return await run(page);
  } finally {
    await browser?.close();
  }
}
