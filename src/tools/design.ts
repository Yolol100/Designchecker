import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { evidence } from '../core/evidence.js';
import { STABLE_SCREENSHOT_OPTIONS, SCREENSHOT_STABILITY_NOTE } from '../core/screenshot.js';
import { assertSafeTarget } from '../core/url.js';
import { hydrateLazyContentForVisualCapture, installNetworkGuard, navigateReadOnlyPage, VISUAL_READINESS_POLICY, withPage } from '../core/browser.js';
import type { Owner, ViewportSpec } from '../core/types.js';

const DEFAULT_VIEWPORTS: ViewportSpec[] = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 }
];

export const SOCIAL_HOSTS = [
  'instagram.com',
  'facebook.com',
  'linkedin.com',
  'tiktok.com',
  'youtube.com',
  'youtu.be',
  'x.com',
  'twitter.com',
  'threads.net',
  'threads.com',
  'pinterest.com',
  'snapchat.com'
] as const;

export function isKnownSocialHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^www\./, '');
  return SOCIAL_HOSTS.some((host) => normalized === host || normalized.endsWith('.' + host));
}

const ORGANIZATION_SCHEMA_TYPES = new Set([
  'Organization',
  'Corporation',
  'LocalBusiness',
  'Store',
  'OnlineStore',
  'ProfessionalService',
  'EducationalOrganization',
  'GovernmentOrganization',
  'MedicalOrganization',
  'NGO',
  'NewsMediaOrganization',
  'SportsOrganization'
]);

function normalizeHostname(hostname: string) {
  return hostname.toLowerCase().replace(/^www\./, '');
}

function entityReferencesHost(entity: Record<string, unknown>, pageHostname: string) {
  const pageHost = normalizeHostname(pageHostname);
  for (const key of ['url', '@id']) {
    const raw = entity[key];
    if (typeof raw !== 'string') continue;
    try {
      if (normalizeHostname(new URL(raw).hostname) === pageHost) return true;
    } catch {
      // Ignore non-URL identity values.
    }
  }
  return false;
}

function schemaTypeList(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  return [];
}

function sameAsList(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  return [];
}

export function collectStructuredSocialLinks(jsonLdBlocks: string[], pageHostname: string) {
  const found = new Map<string, { href: string; hostname: string; source: 'jsonld_sameAs'; schemaType: string }>();

  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (!value || typeof value !== 'object') return;

    const entity = value as Record<string, unknown>;
    const types = schemaTypeList(entity['@type']);
    const organizationType = types.find((type) => ORGANIZATION_SCHEMA_TYPES.has(type));
    if (organizationType && entityReferencesHost(entity, pageHostname)) {
      for (const raw of sameAsList(entity.sameAs)) {
        try {
          const url = new URL(raw);
          if (!['http:', 'https:'].includes(url.protocol) || !isKnownSocialHostname(url.hostname)) continue;
          found.set(url.toString(), {
            href: url.toString(),
            hostname: url.hostname.toLowerCase(),
            source: 'jsonld_sameAs',
            schemaType: organizationType
          });
        } catch {
          // Ignore invalid sameAs values.
        }
      }
    }

    for (const nested of Object.values(entity)) visit(nested);
  };

  for (const block of jsonLdBlocks) {
    try {
      visit(JSON.parse(block));
    } catch {
      // Invalid JSON-LD must not fail the page inspection.
    }
  }

  return [...found.values()];
}

export async function inspectDesign(target: string, owner: Owner = 'design', toolName = 'design_inspect_page') {
  const data = await withPage(target, {}, async (page) => {
    const rendered = await page.evaluate((socialHosts) => {
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
    const links = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')]
      .filter(visible)
      .slice(0, 200)
      .map((el) => {
        let url: URL | null = null;
        try {
          url = new URL(el.href, location.href);
        } catch {
          url = null;
        }
        if (!url || !['http:', 'https:'].includes(url.protocol)) return null;
        return {
          text: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 140),
          ariaLabel: (el.getAttribute('aria-label') ?? '').trim().slice(0, 140) || null,
          href: url.toString(),
          hostname: url.hostname.toLowerCase(),
          rel: (el.getAttribute('rel') ?? '').trim() || null
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
    const currentHost = location.hostname.toLowerCase().replace(/^www\./, '');
    const externalLinks = links.filter((link) => {
      const host = link.hostname.replace(/^www\./, '');
      return host !== currentHost && !host.endsWith('.' + currentHost);
    });
    const socialLinks = externalLinks.filter((link) => {
      const host = link.hostname.replace(/^www\./, '');
      return socialHosts.some((socialHost) => host === socialHost || host.endsWith('.' + socialHost));
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
      links,
      externalLinks,
      socialLinks,
      counts: { links: document.querySelectorAll('a[href]').length, visibleLinksCaptured: links.length, externalLinksCaptured: externalLinks.length, socialLinksCaptured: socialLinks.length, images: document.images.length, dialogs: document.querySelectorAll('dialog,[role="dialog"]').length, landmarks: document.querySelectorAll('main,nav,header,footer,aside,[role="main"],[role="navigation"]').length },
      viewport: { width: innerWidth, height: innerHeight },
      documentSize: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1
    };
    }, [...SOCIAL_HOSTS]);

    const jsonLdBlocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const structuredSocialLinks = collectStructuredSocialLinks(jsonLdBlocks, new URL(page.url()).hostname);
    const socialLinkCandidates = new Map<string, Record<string, unknown>>();

    for (const link of rendered.socialLinks) {
      socialLinkCandidates.set(link.href, { ...link, source: 'rendered_anchor' });
    }
    for (const link of structuredSocialLinks) {
      if (!socialLinkCandidates.has(link.href)) socialLinkCandidates.set(link.href, link);
    }

    return {
      ...rendered,
      structuredSocialLinks,
      socialLinkCandidates: [...socialLinkCandidates.values()],
      counts: {
        ...rendered.counts,
        structuredSocialLinksCaptured: structuredSocialLinks.length,
        socialLinkCandidatesCaptured: socialLinkCandidates.size
      }
    };
  });
  return evidence({ owner, tool: toolName, target, data, limits: ['Rendered-page inspection plus official-site JSON-LD identity-link inspection only.', 'Social candidates may come from visible rendered anchors or Organization-like JSON-LD sameAs values whose url/@id resolves to the inspected site. Visiting the linked profile is still required to verify current public activity.', 'Does not prove usability, conversion uplift, WCAG conformance, or correct behavior on all states/devices.'] });
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
      await navigateReadOnlyPage(page, url.toString());
      assertSafeTarget(page.url());
      const hydration = await hydrateLazyContentForVisualCapture(page);
      const file = path.join(outputDir, `${viewport.name}-${viewport.width}x${viewport.height}.png`);
      await page.screenshot({ path: file, fullPage: true, ...STABLE_SCREENSHOT_OPTIONS });
      const state = await page.evaluate(() => ({ title: document.title, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, activeElement: document.activeElement?.tagName ?? null }));
      captures.push({ viewport, file, state, hydration });
      await context.close();
    }
  } finally {
    await browser.close();
  }
  return evidence({ owner, tool: toolName, target, data: { outputDir, captures, screenshotStability: STABLE_SCREENSHOT_OPTIONS, readinessPolicy: VISUAL_READINESS_POLICY }, limits: ['Screenshot baseline is controlled-runtime evidence; interaction and assistive-technology behavior remain separate tests.', 'A bounded scroll pass runs before capture so lazy and scroll-triggered content can render; virtualized or nested scroll containers can still require a targeted check.', SCREENSHOT_STABILITY_NOTE] });
}
