#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium, devices } from 'playwright';
import axe from 'axe-core';
import { assertSafeTarget } from '../dist/src/core/url.js';

const requestId = process.env.WEBACTUEEL_REQUEST_ID;
const target = process.env.TARGET_URL;
const leadId = process.env.LEAD_ID;
const siteType = process.env.SITE_TYPE;
const scanPolicyVersion = process.env.SCAN_POLICY_VERSION;
if (!requestId || !target || !leadId || !siteType || !scanPolicyVersion) throw new Error('lead-formal environment is incomplete.');
if (!['website','webshop','boekingssite'].includes(siteType)) throw new Error('SITE_TYPE must be website, webshop or boekingssite.');
assertSafeTarget(target);

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const outDir = path.join('results', 'assets', requestId);
await fs.mkdir(outDir, { recursive: true });
const profiles = [
  { name: 'desktop', context: { viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' } },
  { name: 'mobile', context: { ...devices['iPhone 13'], reducedMotion: 'reduce' } }
];
const findings = [];
const browserEvidence = [];
const pages = [];

function priorityLinks(links, origin) {
  const patterns = siteType === 'webshop'
    ? [/product|shop|winkel|category|categorie/i, /cart|winkelwagen/i, /checkout|afrekenen/i]
    : siteType === 'boekingssite'
      ? [/dienst|service|aanbod/i, /booking|boek|afspraak|reserver/i, /contact/i]
      : [/dienst|service|aanbod|werkzaam/i, /contact|offerte|aanvraag/i];
  const normalized = [];
  for (const item of links) {
    try {
      const u = new URL(item.href);
      if (u.origin !== origin || !['http:','https:'].includes(u.protocol)) continue;
      const hay = `${item.text} ${u.pathname}`;
      if (/privacy|cookie|voorwaarden|login|account|mailto:|tel:/i.test(hay)) continue;
      normalized.push({ href: u.toString(), text: item.text, hay });
    } catch {}
  }
  const selected = [];
  for (const re of patterns) {
    const found = normalized.find((item) => re.test(item.hay) && !selected.some((x) => x.href === item.href));
    if (found) selected.push(found);
    if (selected.length >= 2) break;
  }
  return selected;
}

async function guard(page) {
  await page.route('**/*', async (route) => {
    const method = route.request().method().toUpperCase();
    if (!['GET','HEAD'].includes(method)) return route.abort('blockedbyclient');
    try { assertSafeTarget(route.request().url()); await route.continue(); }
    catch { await route.abort('blockedbyclient'); }
  });
}

async function inspect(page, profile, role) {
  assertSafeTarget(page.url());
  const state = await page.evaluate(() => {
    const visible = (el) => { const s=getComputedStyle(el); const r=el.getBoundingClientRect(); return s.display!=='none' && s.visibility!=='hidden' && r.width>0 && r.height>0; };
    const text=(document.body?.innerText||'').replace(/\s+/g,' ').trim();
    return {
      title: document.title,
      text_sample: text.slice(0,6000),
      headings:[...document.querySelectorAll('h1,h2')].filter(visible).map((x)=>(x.textContent||'').trim()).filter(Boolean).slice(0,16),
      links:[...document.querySelectorAll('a[href]')].filter(visible).map((a)=>({href:a.href,text:(a.textContent||a.getAttribute('aria-label')||'').trim()})).slice(0,350),
      forms:[...document.forms].map((f)=>({method:(f.method||'get').toUpperCase(),fields:f.querySelectorAll('input,select,textarea').length})),
      overflow: document.documentElement.scrollWidth > window.innerWidth + 5,
      broken_images:[...document.images].filter((img)=>img.complete && img.naturalWidth===0 && visible(img)).length,
      placeholder:/\b(lorem ipsum|dummy text|placeholder|coming soon|under construction)\b/i.test(text),
      generic_ctas:[...document.querySelectorAll('button,a')].filter(visible).map((x)=>(x.textContent||x.getAttribute('aria-label')||'').trim()).filter((x)=>/^(button|knop|click here|klik hier|read more|lees meer)$/i.test(x)).slice(0,10)
    };
  });
  if (profile === 'mobile' && state.overflow) findings.push({severity:4,type:'mobile_overflow',url:page.url(),profile,role});
  if (state.broken_images) findings.push({severity:3,type:'broken_images',count:state.broken_images,url:page.url(),profile,role});
  if (state.placeholder) findings.push({severity:4,type:'placeholder_content',url:page.url(),profile,role});
  if (state.generic_ctas.length) findings.push({severity:3,type:'generic_cta',values:state.generic_ctas,url:page.url(),profile,role});

  if (role === 'home') {
    await page.addScriptTag({ content: axe.source });
    const a11y = await page.evaluate(async () => await globalThis.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa'] } }));
    for (const v of a11y.violations.filter((x)=>['serious','critical'].includes(x.impact)).slice(0,8)) findings.push({severity:v.impact==='critical'?4:3,type:'accessibility',impact:v.impact,help:v.help,nodes:v.nodes.length,url:page.url(),profile,role});
  }

  const file = path.join(outDir, `${profile}-${role}.png`);
  await page.screenshot({ path:file, fullPage:false });
  const bytes = await fs.readFile(file);
  const ev = { evidence_id:`lead-${sha256(bytes).slice(0,12)}`, evidence_kind:'browser', source:'Yolol100/Designchecker:lead-formal', lead_id:leadId, profile, role, url:page.url(), artifact_ref:file, artifact_sha256:sha256(bytes), captured_at:new Date().toISOString(), viewport:page.viewportSize() };
  browserEvidence.push(ev);
  pages.push({url:page.url(),profile,role,title:state.title,headings:state.headings,forms:state.forms,evidence_id:ev.evidence_id});
  return state.links;
}

const browser = await chromium.launch({ headless:true });
try {
  let routePlan = [{ href: target, role:'home' }];
  for (const profile of profiles) {
    const context = await browser.newContext(profile.context);
    const page = await context.newPage();
    await guard(page);
    const response = await page.goto(target, { waitUntil:'domcontentloaded', timeout:35000 });
    if (response && response.status() >= 400) findings.push({severity:5,type:'home_http_error',status:response.status(),url:target,profile:profile.name,role:'home'});
    const links = await inspect(page, profile.name, 'home');
    if (profile.name === 'desktop') routePlan = [{href:page.url(),role:'home'}, ...priorityLinks(links, new URL(page.url()).origin).map((x,i)=>({href:x.href,role:`priority_${i+1}`}))];
    for (const item of routePlan.slice(1,3)) {
      try { await page.goto(item.href,{waitUntil:'domcontentloaded',timeout:30000}); await inspect(page,profile.name,item.role); }
      catch (error) { findings.push({severity:4,type:'priority_page_unreachable',url:item.href,profile:profile.name,role:item.role,detail:String(error).slice(0,240)}); }
    }
    await context.close();
  }
} finally { await browser.close(); }

const payload = {
  schema_version:'webactueel-leadscanner-handoff/1.2',
  source_repository:'Yolol100/Designchecker',
  source_runtime:'scripts/lead-formal.mjs',
  lead_id:leadId,
  target,
  site_type:siteType,
  scan_policy_version:scanPolicyVersion,
  read_only:true,
  profiles:['desktop','mobile'],
  route_limit:3,
  pages,
  findings,
  browser_evidence_records:browserEvidence,
  limitations:['Automated browser evidence only; Leads owns qualification/scoring and Website QA owns full release QA.','No form submission, account enumeration, contact enrichment or email action is performed.']
};
console.log(JSON.stringify(payload));
