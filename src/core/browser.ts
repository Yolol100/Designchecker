import { chromium, type Browser, type Page } from 'playwright';
import { assertSafeTarget } from './url.js';

export async function withPage<T>(target: string, options: { width?: number; height?: number } = {}, run: (page: Page) => Promise<T>): Promise<T> {
  const url = assertSafeTarget(target);
  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: options.width ?? 1440, height: options.height ?? 1000 },
      reducedMotion: 'reduce'
    });
    const page = await context.newPage();
    await page.goto(url.toString(), { waitUntil: 'networkidle', timeout: 45000 });
    return await run(page);
  } finally {
    await browser?.close();
  }
}
