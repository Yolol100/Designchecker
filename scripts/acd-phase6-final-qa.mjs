#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const base='https://acdcleaning.concept-webactueel-7.com';
const outDir=path.join('results','acd-phase6-final-qa');fs.mkdirSync(outDir,{recursive:true});
const pages=[
  ['home','/'],['diensten','/diensten/'],['contact','/contact/'],['zakelijke-offerte','/zakelijke-offerte/'],['particuliere-wasbeurt','/particuliere-wasbeurt/'],['ozonbehandeling','/ozonbehandeling/'],['bedankt-zakelijk','/bedankt-zakelijke-offerte/'],['bedankt-particulier','/bedankt-particuliere-wasbeurt/']
];
const result={schema_version:'acd-phase6-final-qa/1.0',target:base,started_at:new Date().toISOString(),pages:[],endpoints:{},checks:[],status:'failed'};
const add=(name,ok,detail=null,severity='high')=>result.checks.push({name,ok:Boolean(ok),detail,severity});
let browser;
try{
 browser=await chromium.launch({headless:true});const ctx=await browser.newContext({viewport:{width:1440,height:1000}});const p=await ctx.newPage();
 for(const [name,route] of pages){const errors=[];const listener=m=>{if(m.type()==='error')errors.push(m.text())};p.on('console',listener);let response=null;try{response=await p.goto(base+route,{waitUntil:'networkidle',timeout:45000})}catch(e){errors.push(`NAV:${e.message}`)}const imgs=await p.locator('img').count().catch(()=>0);const broken=await p.locator('img').evaluateAll(nodes=>nodes.filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.currentSrc||i.src)).catch(()=>[]);const mixed=await p.locator('[src],[href]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('src')||n.getAttribute('href')).filter(v=>typeof v==='string'&&v.startsWith('http://'))).catch(()=>[]);const robots=await p.locator('meta[name="robots"]').getAttribute('content').catch(()=>null);const h1=await p.locator('h1').allInnerTexts().catch(()=>[]);const forms=await p.locator('form.elementor-form').count().catch(()=>0);const title=await p.title().catch(()=>'');const finalUrl=p.url();result.pages.push({name,route,status:response?.status()||0,final_url:finalUrl,title,h1,forms,images:imgs,broken_images:broken,mixed_content:mixed,robots,console_errors:errors.slice(0,20)});p.off('console',listener);await p.screenshot({path:path.join(outDir,`${name}.png`),fullPage:true});}
 const robotsResp=await fetch(base+'/robots.txt',{redirect:'manual'});result.endpoints.robots={status:robotsResp.status,body:(await robotsResp.text()).slice(0,5000)};
 const sitemapResp=await fetch(base+'/sitemap_index.xml',{redirect:'manual'});result.endpoints.sitemap={status:sitemapResp.status,body:(await sitemapResp.text()).slice(0,5000)};
 const mediaResp=await fetch(base+'/wp-json/wp/v2/media?media_type=image&status=inherit&per_page=1');result.endpoints.media_rest={status:mediaResp.status,total:mediaResp.headers.get('x-wp-total'),total_pages:mediaResp.headers.get('x-wp-totalpages')};
 const notFoundResp=await fetch(base+'/webactueel-qa-404-20260910',{redirect:'manual'});result.endpoints.not_found={status:notFoundResp.status,location:notFoundResp.headers.get('location')};
 for(const row of result.pages){add(`${row.name}: HTTP 200`,row.status===200,row.status);add(`${row.name}: HTTPS`,row.final_url.startsWith('https://'),row.final_url);add(`${row.name}: title present`,row.title.trim().length>0,row.title,'medium');add(`${row.name}: H1 present`,row.h1.length>=1,row.h1,'medium');add(`${row.name}: no broken rendered images`,row.broken_images.length===0,row.broken_images,'high');add(`${row.name}: no mixed-content URLs`,row.mixed_content.length===0,row.mixed_content,'high');}
 const b=result.pages.find(x=>x.name==='zakelijke-offerte'),c=result.pages.find(x=>x.name==='particuliere-wasbeurt');add('business form rendered',b?.forms===1,b?.forms);add('consumer form rendered',c?.forms===1,c?.forms);add('robots.txt reachable',result.endpoints.robots.status===200,result.endpoints.robots.status,'medium');add('sitemap index reachable',result.endpoints.sitemap.status===200,result.endpoints.sitemap.status,'medium');add('active image REST count is 83',Number(result.endpoints.media_rest.total)===83,result.endpoints.media_rest,'medium');add('unknown URL returns 404',result.endpoints.not_found.status===404,result.endpoints.not_found.status,'medium');
 result.status=result.checks.filter(x=>x.severity==='high').every(x=>x.ok)?'success':'failed';await ctx.close();
}catch(e){result.error=String(e?.message||e)}finally{if(browser)await browser.close().catch(()=>{});result.completed_at=new Date().toISOString();fs.writeFileSync(path.join(outDir,'result.json'),JSON.stringify(result,null,2)+'\n')}
console.log(JSON.stringify({status:result.status,failed:result.checks.filter(x=>!x.ok)},null,2));if(result.status!=='success')process.exit(1);
