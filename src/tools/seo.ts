import { evidence } from '../core/evidence.js';
import { withPage } from '../core/browser.js';
import { assertPublicTarget } from '../core/url.js';
import type { Owner } from '../core/types.js';

export async function inspectSeo(target: string, owner: Owner = 'seo', toolName = 'seo_inspect_page') {
  const data = await withPage(target, {}, async (page) => page.evaluate(() => {
    const meta = (selector: string) => document.querySelector<HTMLMetaElement>(selector)?.content?.trim() || null;
    const link = (selector: string) => document.querySelector<HTMLLinkElement>(selector)?.href || null;
    const allLinks = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')];
    const origin = location.origin;
    const jsonLd = [...document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]')];
    return {
      title: document.title || null, titleLength: document.title.length,
      description: meta('meta[name="description"]'), robots: meta('meta[name="robots"]'), canonical: link('link[rel="canonical"]'),
      hreflang: [...document.querySelectorAll<HTMLLinkElement>('link[rel="alternate"][hreflang]')].map((el) => ({ lang: el.hreflang, href: el.href })),
      headings: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].slice(0, 120).map((el) => ({ tag: el.tagName.toLowerCase(), text: (el.textContent ?? '').trim().slice(0, 180) })),
      images: { total: document.images.length, missingAlt: [...document.images].filter((img) => !img.hasAttribute('alt')).length, emptyAlt: [...document.images].filter((img) => img.getAttribute('alt') === '').length },
      links: { total: allLinks.length, internal: allLinks.filter((a) => a.href.startsWith(origin)).length, external: allLinks.filter((a) => a.href.startsWith('http') && !a.href.startsWith(origin)).length, nofollow: allLinks.filter((a) => a.rel.split(/\s+/).includes('nofollow')).length },
      structuredData: jsonLd.map((script) => { try { const parsed = JSON.parse(script.textContent || '{}'); return { validJson: true, type: parsed['@type'] ?? null }; } catch { return { validJson: false, type: null }; } }),
      openGraph: { title: meta('meta[property="og:title"]'), description: meta('meta[property="og:description"]'), image: meta('meta[property="og:image"]') }
    };
  }));
  return evidence({ owner, tool: toolName, target, data, limits: ['Single rendered-page inspection; no ranking, traffic, indexation or Search Console claim is inferred.'] });
}

async function safeRequest(input: string, method: 'HEAD' | 'GET'): Promise<Response> {
  let current = await assertPublicTarget(input);
  for (let redirects = 0; redirects <= 5; redirects += 1) {
    const response = await fetch(current, { method, redirect: 'manual', signal: AbortSignal.timeout(10000) });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) return response;
      if (redirects === 5) throw new Error('Too many redirects.');
      current = await assertPublicTarget(new URL(location, current).toString());
      continue;
    }
    return response;
  }
  throw new Error('Too many redirects.');
}

export async function checkLinks(target: string, maxLinks = 40, owner: Owner = 'seo', toolName = 'seo_check_links') {
  const links = await withPage(target, {}, async (page) => page.evaluate(() => [...new Set([...document.querySelectorAll<HTMLAnchorElement>('a[href]')].map((a) => a.href).filter((href) => href.startsWith('http')))]));
  const checked: Array<{ url: string; status: number | null; ok: boolean; error?: string }> = [];
  for (const url of links.slice(0, maxLinks)) {
    try {
      let response = await safeRequest(url, 'HEAD');
      if (response.status === 405 || response.status === 403) response = await safeRequest(url, 'GET');
      checked.push({ url, status: response.status, ok: response.ok });
    } catch (error) {
      checked.push({ url, status: null, ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return evidence({ owner, tool: toolName, target, data: { discovered: links.length, checked: checked.length, results: checked }, limits: [`Checks at most ${maxLinks} rendered links per call.`, 'Private/local targets and redirects, including hostnames that resolve to blocked address ranges, are rejected; transient blocks, bot protection and rate limits can still cause false positives.'] });
}
