import type { Page } from 'playwright';
import { isBlockedAddress } from './url.js';

export type SourceAssetKind = 'image' | 'background' | 'video_poster' | 'picture_source';

export interface SourceAssetCandidate {
  kind: SourceAssetKind;
  rawUrl: string;
  alt?: string;
  width?: number;
  height?: number;
  visible?: boolean;
  media?: string;
}

export interface SourceAssetRecord {
  kind: SourceAssetKind;
  url: string;
  queryStripped: boolean;
  alt: string | null;
  width: number | null;
  height: number | null;
  visible: boolean | null;
  media: string | null;
}

const MAX_ASSETS = 120;
const MAX_CANDIDATES = 300;

export function extractCssBackgroundUrls(value: string): string[] {
  const matches: string[] = [];
  const re = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi;
  for (const match of value.matchAll(re)) {
    const raw = (match[1] ?? match[2] ?? match[3] ?? '').trim();
    if (raw) matches.push(raw);
    if (matches.length >= 10) break;
  }
  return matches;
}

export function normalizeSourceAssetUrl(raw: string, baseUrl: string): { url: string; queryStripped: boolean } | null {
  try {
    const url = new URL(raw.trim(), baseUrl);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (host === 'localhost' || host.endsWith('.localhost') || isBlockedAddress(host)) return null;
    const queryStripped = Boolean(url.search);
    url.search = '';
    url.hash = '';
    return { url: url.toString(), queryStripped };
  } catch {
    return null;
  }
}

export function buildSourceAssetInventory(baseUrl: string, candidates: SourceAssetCandidate[], maxAssets = MAX_ASSETS) {
  const limit = Number.isFinite(maxAssets) ? Math.max(0, Math.min(MAX_ASSETS, Math.floor(maxAssets))) : MAX_ASSETS;
  const assets: SourceAssetRecord[] = [];
  const seen = new Set<string>();
  let rejected = 0;
  let duplicates = 0;
  for (const item of candidates.slice(0, MAX_CANDIDATES)) {
    const normalized = normalizeSourceAssetUrl(item.rawUrl, baseUrl);
    if (!normalized) { rejected += 1; continue; }
    const key = item.kind + '|' + normalized.url + '|' + (item.media ?? '');
    if (seen.has(key)) { duplicates += 1; continue; }
    seen.add(key);
    if (assets.length >= limit) continue;
    const dimension = (n: number | undefined) => typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
    assets.push({
      kind: item.kind,
      url: normalized.url,
      queryStripped: normalized.queryStripped,
      alt: item.alt?.trim().slice(0, 200) || null,
      width: dimension(item.width),
      height: dimension(item.height),
      visible: typeof item.visible === 'boolean' ? item.visible : null,
      media: item.media?.trim().slice(0, 160) || null
    });
  }
  return {
    assets,
    inspectedCandidates: Math.min(candidates.length, MAX_CANDIDATES),
    truncated: candidates.length > MAX_CANDIDATES || seen.size > assets.length,
    rejected,
    duplicates,
    limits: [
      'Rendered DOM and computed backgrounds only; not a complete site crawl or original media download.',
      'Tracking and signed query parameters are omitted from reported asset URLs; do not reuse URLs as verified WordPress attachment identities.',
      'Source media and font use do not establish reuse rights or Elementor target compatibility.'
    ]
  };
}

export async function collectSourceAssetInventory(page: Page) {
  const candidates = await page.evaluate(() => {
    const rows: SourceAssetCandidate[] = [];
    const isVisible = (element: Element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    for (const img of [...document.images].slice(0, 150)) {
      rows.push({ kind: 'image', rawUrl: img.currentSrc || img.src, alt: img.alt,
        width: img.naturalWidth, height: img.naturalHeight, visible: isVisible(img) });
    }
    for (const video of [...document.querySelectorAll('video')].slice(0, 30)) {
      if (video.poster) rows.push({ kind: 'video_poster', rawUrl: video.poster, visible: isVisible(video) });
    }
    for (const source of [...document.querySelectorAll('picture source[srcset]')].slice(0, 60)) {
      const firstCandidate = (source.getAttribute('srcset') ?? '').split(',')[0]?.trim().split(/\s+/)[0] ?? '';
      if (firstCandidate) rows.push({ kind: 'picture_source', rawUrl: firstCandidate,
        media: source.getAttribute('media') ?? '', visible: isVisible(source.parentElement ?? source) });
    }
    let backgroundCount = 0;
    for (const element of [...document.body.querySelectorAll('*')].slice(0, 1000)) {
      if (!isVisible(element)) continue;
      for (const match of getComputedStyle(element).backgroundImage.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi)) {
        const rawUrl = (match[1] ?? match[2] ?? match[3] ?? '').trim();
        if (rawUrl) rows.push({ kind: 'background', rawUrl, visible: true });
        if (++backgroundCount >= 70) break;
      }
      if (backgroundCount >= 70) break;
    }
    return rows.slice(0, 300);
  });
  return buildSourceAssetInventory(page.url(), candidates);
}
