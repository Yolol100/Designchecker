import { evidence } from '../core/evidence.js';
import { withPage } from '../core/browser.js';

export async function inspectLeadSite(target: string) {
  const data = await withPage(target, {}, async (page) => page.evaluate(() => {
    const mailtos = [...document.querySelectorAll<HTMLAnchorElement>('a[href^="mailto:"]')].map((a) => a.href.replace(/^mailto:/i, '').split('?')[0]?.trim()).filter((value): value is string => Boolean(value));
    const phones = [...document.querySelectorAll<HTMLAnchorElement>('a[href^="tel:"]')].map((a) => a.href.replace(/^tel:/i, '').trim());
    const links = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')].map((a) => ({ text: (a.textContent ?? '').trim().toLowerCase(), href: a.href }));
    return {
      title: document.title,
      firstPublishedBusinessEmail: mailtos[0] ?? null,
      publishedEmailCount: new Set(mailtos).size,
      publishedPhoneCount: new Set(phones).size,
      contactLinks: links.filter((item) => /contact|over ons|about|offerte|afspraak/.test(item.text)).slice(0, 20),
      hasContactForm: document.querySelectorAll('form input[type="email"], form input[type="tel"]').length > 0,
      hasPrivacyLink: links.some((item) => /privacy|avg|gdpr/.test(item.text)),
      hasBusinessIdentitySignals: Boolean(document.querySelector('footer')) && document.body.innerText.length > 300
    };
  }));
  return evidence({ owner: 'leads', tool: 'lead_inspect_public_site', target, data, limits: ['Returns public on-page signals only and at most one displayed email in the primary field.', 'Does not qualify a lead, update the Lead Registry, draft outreach, send email, or infer private contact data.'] });
}
