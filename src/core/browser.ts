import { chromium, type Browser, type Page } from 'playwright';
import { assertPublicTarget } from './url.js';

export const VISUAL_READINESS_POLICY = {
  navigation: 'domcontentloaded',
  body: 'visible',
  load: 'best-effort',
  fonts: 'ready',
  animationFrames: 2,
  lazyContentHydration: 'scroll-pass'
} as const;

export type PublicPageAccessBarrierKind = 'cloudflare_challenge' | 'access_denied' | 'bot_verification';

export interface PublicPageAccessBarrier {
  blocked: boolean;
  kind: PublicPageAccessBarrierKind | null;
  signals: string[];
  url: string;
  title: string;
}

export function classifyPublicPageAccessBarrier(input: { title: string; bodyText: string; html: string; url: string }): PublicPageAccessBarrier {
  const title = input.title.trim().toLowerCase();
  const body = input.bodyText.replace(/\s+/g, ' ').trim().toLowerCase();
  const html = input.html.toLowerCase();
  const signals: string[] = [];

  const hasCloudflareMarker = /cf-chl|challenges\.cloudflare\.com|cloudflare/.test(html) || body.includes('cloudflare');
  const hasSecurityVerification = /performing security verification|verify you are human|checking your browser|enable javascript and cookies to continue/.test(body);
  if ((title.includes('just a moment') && hasSecurityVerification) || (hasCloudflareMarker && hasSecurityVerification)) {
    if (title.includes('just a moment')) signals.push('title:just-a-moment');
    if (hasSecurityVerification) signals.push('body:security-verification');
    if (hasCloudflareMarker) signals.push('provider:cloudflare');
    return { blocked: true, kind: 'cloudflare_challenge', signals, url: input.url, title: input.title };
  }

  const hasAccessDenied = title.includes('access denied') || /\baccess denied\b/.test(body);
  const hasGatewayMarker = /akamai|reference #|request could not be satisfied|cloudfront/.test(body + ' ' + html);
  if (hasAccessDenied && hasGatewayMarker) {
    signals.push('access-denied');
    signals.push('gateway-or-waf-marker');
    return { blocked: true, kind: 'access_denied', signals, url: input.url, title: input.title };
  }

  const hasBotVerification = /verify you are human|checking your browser|security verification/.test(body);
  const hasChallengeMarker = /captcha|challenge|bot verification|turnstile/.test(body + ' ' + html);
  if (hasBotVerification && hasChallengeMarker) {
    signals.push('bot-verification');
    signals.push('challenge-marker');
    return { blocked: true, kind: 'bot_verification', signals, url: input.url, title: input.title };
  }

  return { blocked: false, kind: null, signals: [], url: input.url, title: input.title };
}

export async function detectPublicPageAccessBarrier(page: Page): Promise<PublicPageAccessBarrier> {
  const snapshot = await page.evaluate(() => ({
    title: document.title,
    bodyText: (document.body?.innerText ?? '').slice(0, 12000),
    html: (document.documentElement?.outerHTML ?? '').slice(0, 30000),
    url: location.href
  }));
  return classifyPublicPageAccessBarrier(snapshot);
}

export interface RenderedPageViability {
  usable: boolean;
  reason: 'meaningful_content' | 'insufficient_rendered_content';
  normalizedTextLength: number;
  visibleInteractiveCount: number;
  visibleMediaCount: number;
  visibleLandmarkCount: number;
}

export function classifyRenderedPageViability(input: {
  normalizedTextLength: number;
  visibleInteractiveCount: number;
  visibleMediaCount: number;
  visibleLandmarkCount: number;
}): RenderedPageViability {
  const meaningful =
    input.normalizedTextLength >= 40 ||
    input.visibleInteractiveCount > 0 ||
    input.visibleMediaCount > 0;

  return {
    usable: meaningful,
    reason: meaningful ? 'meaningful_content' : 'insufficient_rendered_content',
    normalizedTextLength: input.normalizedTextLength,
    visibleInteractiveCount: input.visibleInteractiveCount,
    visibleMediaCount: input.visibleMediaCount,
    visibleLandmarkCount: input.visibleLandmarkCount
  };
}

export async function assessRenderedPageViability(page: Page): Promise<RenderedPageViability> {
  const metrics = await page.evaluate(() => {
    const visible = (el: Element) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || '1') > 0 && rect.width > 0 && rect.height > 0;
    };
    const text = (document.body?.innerText ?? '').replace(/\s+/g, ' ').trim();
    const interactive = [...document.querySelectorAll('a[href],button,input,select,textarea,[role="button"]')].filter(visible);
    const media = [...document.querySelectorAll('img,video,canvas,svg,picture')].filter((el) => {
      if (!visible(el)) return false;
      if (el instanceof HTMLImageElement) return el.complete && el.naturalWidth > 0 && el.naturalHeight > 0;
      if (el instanceof HTMLVideoElement) return el.readyState > 0 || Boolean(el.poster);
      return true;
    });
    const landmarks = [...document.querySelectorAll('main,nav,header,footer,aside,[role="main"],[role="navigation"]')].filter(visible);
    return {
      normalizedTextLength: text.length,
      visibleInteractiveCount: interactive.length,
      visibleMediaCount: media.length,
      visibleLandmarkCount: landmarks.length
    };
  });
  return classifyRenderedPageViability(metrics);
}

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

  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });

  const after = await page.evaluate(() => ({
    scrollHeight: document.scrollingElement?.scrollHeight ?? document.documentElement.scrollHeight,
    imageCount: document.images.length,
    incompleteImageCount: [...document.images].filter((img) => !img.complete || img.naturalWidth === 0).length
  }));

  return {
    passes,
    scrollSteps,
    initialScrollHeight: before.scrollHeight,
    finalScrollHeight: after.scrollHeight,
    initialImageCount: before.imageCount,
    finalImageCount: after.imageCount,
    initialIncompleteImageCount: before.incompleteImageCount,
    finalIncompleteImageCount: after.incompleteImageCount
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
