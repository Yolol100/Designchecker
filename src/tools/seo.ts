import { evidence } from '../core/evidence.js';
import { withPage } from '../core/browser.js';

export async function inspectSeo(target: string) {
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
  return evidence({ owner: 'seo', tool: 'seo_inspect_page', target, data, limits: ['Single rendered-page inspection; no ranking, traffic, indexation or Search Console claim is inferred.'] });
}

export async function checkLinks(target: string, maxLinks = 40) {
  const links = await withPage(target, {}, async (page) => page.evaluate(() => [...new Set([...document.querySelectorAll<HTMLAnchorElement>('a[href]')].map((a) => a.href).filter((href) => href.startsWith('http')))]));
  const checked: Array<{ url: string; status: number | null; ok: boolean; error?: string }> = [];
  for (const url of links.slice(0, maxLinks)) {
    try {
      let response = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(10000) });
      if (response.status === 405 || response.status === 403) response = await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(10000) });
      checked.push({ url, status: response.status, ok: response.ok });
    } catch (error) {
      checked.push({ url, status: null, ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return evidence({ owner: 'seo', tool: 'seo_check_links', target, data: { discovered: links.length, checked: checked.length, results: checked }, limits: [`Checks at most ${maxLinks} rendered links per call.`, 'Transient blocks, bot protection and rate limits can cause false positives.'] });
}
