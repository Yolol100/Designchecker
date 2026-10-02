import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type Browser, type ConsoleMessage, type Request, type Response } from 'playwright';
import { evidence } from '../core/evidence.js';
import {
  assessRenderedPageViability,
  detectPublicPageAccessBarrier,
  installNetworkGuard,
  waitForVisualReadiness
} from '../core/browser.js';
import { assertPublicTarget } from '../core/url.js';

export type HealthVerdict = 'pass' | 'warning' | 'fail';

export interface HealthSignalInput {
  httpStatus: number | null;
  navigationError: string | null;
  accessBlocked: boolean;
  renderUsable: boolean | null;
  title: string;
  criticalMarkers: string[];
  consoleErrors: string[];
  pageErrors: string[];
  firstPartyHttpErrors: Array<{ url: string; status: number }>;
  firstPartyRequestFailures: Array<{ url: string; error: string | null }>;
}

export function classifyHealthSignals(input: HealthSignalInput) {
  const failures: string[] = [];
  const warnings: string[] = [];

  if (input.navigationError) {
    failures.push('navigation_error');
  } else if (input.httpStatus === null) {
    failures.push('missing_http_status');
  } else if (input.httpStatus >= 500) {
    failures.push(`http_${input.httpStatus}`);
  } else if (input.httpStatus === 404 || input.httpStatus === 410) {
    failures.push(`http_${input.httpStatus}`);
  } else if (input.httpStatus >= 400) {
    warnings.push(`http_${input.httpStatus}`);
  }

  for (const marker of input.criticalMarkers) failures.push(`critical:${marker}`);
  if (!input.accessBlocked && input.renderUsable === false) failures.push('insufficient_rendered_content');

  if (input.accessBlocked) warnings.push('access_barrier');
  if (!input.title.trim()) warnings.push('missing_title');
  if (input.pageErrors.length > 0) warnings.push('page_errors');
  if (input.consoleErrors.length > 0) warnings.push('console_errors');
  if (input.firstPartyHttpErrors.length > 0) warnings.push('first_party_http_errors');
  if (input.firstPartyRequestFailures.length > 0) warnings.push('first_party_request_failures');

  return {
    verdict: (failures.length > 0 ? 'fail' : warnings.length > 0 ? 'warning' : 'pass') as HealthVerdict,
    failures: [...new Set(failures)],
    warnings: [...new Set(warnings)]
  };
}

export function normalizeHealthTarget(input: string) {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('Health target is empty.');
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function detectCriticalHealthMarkers(title: string, bodyText: string) {
  const haystack = `${title}\n${bodyText}`.slice(0, 20000);
  const markers: string[] = [];
  const checks: Array<[string, RegExp]> = [
    ['wordpress-critical-error', /there has been a critical error on this website/i],
    ['database-connection-error', /error establishing a database connection/i],
    ['wordpress-maintenance', /briefly unavailable for scheduled maintenance/i],
    ['wordpress-technical-difficulties', /the site is experiencing technical difficulties/i],
    ['wordpress-error-title', /wordpress\s*[›>-]\s*error/i],
    ['php-fatal-error', /fatal error:\s.*(?:wp-content|wp-includes|wp-admin|\/home\/)/i],
    ['php-parse-error', /parse error:\s.*(?:wp-content|wp-includes|wp-admin|\/home\/)/i],
    ['gateway-error', /(?:^|\n)\s*(?:502 bad gateway|503 service unavailable|504 gateway time-?out)\s*(?:\n|$)/im]
  ];
  for (const [id, pattern] of checks) if (pattern.test(haystack)) markers.push(id);
  return markers;
}

function sameSiteHost(a: string, b: string) {
  const normalize = (value: string) => value.toLowerCase().replace(/^www\./, '');
  return normalize(a) === normalize(b);
}

export async function checkWebsiteHealth(
  target: string,
  options: { browser?: Browser; screenshotDir?: string; screenshotName?: string } = {}
) {
  const normalizedTarget = normalizeHealthTarget(target);
  const safeTarget = await assertPublicTarget(normalizedTarget);
  const rootHost = safeTarget.hostname;
  const ownBrowser = !options.browser;
  const browser = options.browser ?? await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce'
  });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const firstPartyHttpErrors: Array<{ url: string; status: number }> = [];
  const firstPartyRequestFailures: Array<{ url: string; error: string | null }> = [];
  let screenshot: string | null = null;

  page.on('console', (message: ConsoleMessage) => {
    if (message.type() === 'error' && consoleErrors.length < 20) consoleErrors.push(message.text().slice(0, 1000));
  });
  page.on('pageerror', (error: Error) => {
    if (pageErrors.length < 20) pageErrors.push(error.message.slice(0, 1000));
  });
  page.on('response', (response: Response) => {
    try {
      const url = new URL(response.url());
      if (sameSiteHost(url.hostname, rootHost) && response.status() >= 400 && firstPartyHttpErrors.length < 30) {
        firstPartyHttpErrors.push({ url: response.url(), status: response.status() });
      }
    } catch {
      // Ignore non-HTTP response URLs.
    }
  });
  page.on('requestfailed', (request: Request) => {
    try {
      const url = new URL(request.url());
      if (sameSiteHost(url.hostname, rootHost) && firstPartyRequestFailures.length < 30) {
        firstPartyRequestFailures.push({ url: request.url(), error: request.failure()?.errorText ?? null });
      }
    } catch {
      // Ignore non-HTTP request URLs.
    }
  });

  let httpStatus: number | null = null;
  let navigationError: string | null = null;
  let title = '';
  let bodyText = '';
  let accessBarrier: Awaited<ReturnType<typeof detectPublicPageAccessBarrier>> | null = null;
  let renderViability: Awaited<ReturnType<typeof assessRenderedPageViability>> | null = null;

  try {
    await installNetworkGuard(page);
    try {
      const response = await page.goto(safeTarget.toString(), { waitUntil: 'domcontentloaded', timeout: 45000 });
      httpStatus = response?.status() ?? null;
      await assertPublicTarget(page.url());
      await waitForVisualReadiness(page).catch(() => undefined);
      title = await page.title().catch(() => '');
      bodyText = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
      accessBarrier = await detectPublicPageAccessBarrier(page).catch(() => null);
      renderViability = await assessRenderedPageViability(page).catch(() => null);
    } catch (error) {
      navigationError = error instanceof Error ? error.message : String(error);
      title = await page.title().catch(() => '');
      bodyText = await page.locator('body').innerText({ timeout: 1000 }).catch(() => '');
    }

    const criticalMarkers = detectCriticalHealthMarkers(title, bodyText);
    const classification = classifyHealthSignals({
      httpStatus,
      navigationError,
      accessBlocked: accessBarrier?.blocked ?? false,
      renderUsable: renderViability?.usable ?? null,
      title,
      criticalMarkers,
      consoleErrors,
      pageErrors,
      firstPartyHttpErrors,
      firstPartyRequestFailures
    });

    if (options.screenshotDir && classification.verdict !== 'pass') {
      await mkdir(options.screenshotDir, { recursive: true });
      const name = options.screenshotName ?? safeTarget.hostname.replace(/[^a-z0-9.-]+/gi, '_');
      screenshot = path.join(options.screenshotDir, `${name}.png`);
      try {
        await page.screenshot({ path: screenshot, fullPage: true });
      } catch {
        screenshot = null;
      }
    }

    return evidence({
      owner: 'website-qa-checklist',
      tool: 'qa_post_update_healthcheck',
      target: safeTarget.toString(),
      evidenceLevel: 'production_observation',
      status: classification.verdict === 'fail' ? 'error' : classification.verdict === 'warning' ? 'partial' : 'ok',
      data: {
        verdict: classification.verdict,
        failures: classification.failures,
        warnings: classification.warnings,
        httpStatus,
        finalUrl: page.url() || safeTarget.toString(),
        title,
        accessBarrier,
        renderViability,
        criticalMarkers,
        consoleErrors,
        pageErrors,
        firstPartyHttpErrors,
        firstPartyRequestFailures,
        screenshot,
        navigationError
      },
      limits: [
        'Read-only public-browser smoke test after maintenance; it does not prove full site, checkout, form, email, accessibility or payment correctness.',
        'Console, subresource and WAF findings are warnings unless a decisive homepage failure is also observed.'
      ]
    });
  } finally {
    await context.close().catch(() => undefined);
    if (ownBrowser) await browser.close().catch(() => undefined);
  }
}
