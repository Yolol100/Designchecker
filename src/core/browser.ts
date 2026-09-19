import { chromium, type Browser, type Page } from 'playwright';
import { assertPublicTarget } from './url.js';

export const VISUAL_READINESS_POLICY = {
  navigation: 'domcontentloaded',
  body: 'visible',
  load: 'best-effort',
  fonts: 'ready',
  animationFrames: 2
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
