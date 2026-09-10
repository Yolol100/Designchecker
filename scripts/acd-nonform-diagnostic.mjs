#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const base='https://acdcleaning.concept-webactueel-7.com';
const routes=['/','/carwash-progamma/','/klein-schadeherstel/','/fotostudio-auto/','/fullservice-carwash/','/service/'];
const outDir=path.join('results','acd-nonform-diagnostic');
fs.mkdirSync(outDir,{recursive:true});
const result={started_at:new Date().toISOString(),pages:[],status:'failed'};
let browser;
try{
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  for(const route of routes){
    const page=await context.newPage();
    const pageErrors=[]; const consoleErrors=[]; const failedRequests=[]; const responses404=[];
    page.on('pageerror',e=>pageErrors.push({message:e.message,stack:e.stack?.slice(0,3000)||null}));
    page.on('console',m=>{if(m.type()==='error')consoleErrors.push({text:m.text(),location:m.location()});});
    page.on('requestfailed',r=>failedRequests.push({url:r.url(),failure:r.failure()?.errorText||null,resourceType:r.resourceType()}));
    page.on('response',r=>{if(r.status()>=400)responses404.push({url:r.url(),status:r.status(),resourceType:r.request().resourceType()});});
    let response=null;
    try{response=await page.goto(base+route,{waitUntil:'networkidle',timeout:45000});}catch(e){pageErrors.push({message:'NAV '+e.message,stack:null});}
    const bodyText=await page.locator('body').innerText().catch(()=>'');
    const mainText=await page.locator('main').innerText().catch(()=>'');
    const headings=await page.locator('h1,h2,h3,h4,h5,h6').evaluateAll(nodes=>nodes.map(n=>({tag:n.tagName,text:(n.textContent||'').trim()}))).catch(()=>[]);
    const title=await page.title().catch(()=>'');
    const visibleImages=await page.locator('img:visible').count().catch(()=>0);
    const forms=await page.locator('form.elementor-form').count().catch(()=>0);
    const row={route,status:response?.status()||0,final_url:page.url(),title,body_text_length:bodyText.length,main_text_length:mainText.length,body_text_preview:bodyText.slice(0,3500),main_text_preview:mainText.slice(0,2500),headings,visible_images:visibleImages,forms,page_errors:pageErrors,console_errors:consoleErrors,failed_requests:failedRequests,responses_4xx_5xx:responses404};
    result.pages.push(row);
    await page.screenshot({path:path.join(outDir,route==='/'?'home.png':route.replaceAll('/','')+'.png'),fullPage:true});
    await page.close();
  }
  await context.close();
  result.status='success';
}catch(e){result.error=String(e?.stack||e);}finally{
  if(browser)await browser.close().catch(()=>{});
  result.completed_at=new Date().toISOString();
  fs.writeFileSync(path.join(outDir,'result.json'),JSON.stringify(result,null,2)+'\n');
}
console.log(JSON.stringify({status:result.status,pages:result.pages.map(p=>({route:p.route,status:p.status,main_text_length:p.main_text_length,headings:p.headings,page_errors:p.page_errors,console_errors:p.console_errors,responses_4xx_5xx:p.responses_4xx_5xx}))},null,2));
if(result.status!=='success')process.exit(1);
