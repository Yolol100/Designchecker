import { chromium, type Browser, type Page } from 'playwright';
import { assertPublicTarget } from './url.js';

export async function installNetworkGuard(page: Page): Promise<void> {
  const checkedHosts = new Map<string, Promise<void>>();
  await page.route('**/*', async (route) => {
    const requestUrl = route.request().url();
    try {
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

export async function withPage<T>(target: string, options: { width?: number; height?: number } = {}, run: (page: Page) => Promise<T>): Promise<T> {
  const url = await assertPublicTarget(target);
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: options.width ?? 1440, height: options.height ?? 1000 },
      reducedMotion: 'reduce'
    });
    const page = await context.newPage();
    await installNetworkGuard(page);
    await page.goto(url.toString(), { waitUntil: 'networkidle', timeout: 45000 });
    await assertPublicTarget(page.url());
    return await run(page);
  } finally {
    await browser?.close();
  }
}
