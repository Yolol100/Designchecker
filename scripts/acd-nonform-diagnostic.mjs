#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const url='https://acdcleaning.concept-webactueel-7.com/';
const outDir=path.join('results','acd-nonform-diagnostic');
fs.mkdirSync(outDir,{recursive:true});
const result={started_at:new Date().toISOString(),url,status:'failed'};
let browser;
try{
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();
  const pageErrors=[]; const consoleErrors=[]; const failedRequests=[]; const badResponses=[];
  page.on('pageerror',e=>pageErrors.push({message:e.message,stack:e.stack?.slice(0,5000)||null}));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push({text:m.text(),location:m.location()});});
  page.on('requestfailed',r=>failedRequests.push({url:r.url(),failure:r.failure()?.errorText||null,resourceType:r.resourceType()}));
  page.on('response',r=>{if(r.status()>=400)badResponses.push({url:r.url(),status:r.status(),resourceType:r.request().resourceType()});});
  let response=null;
  try{response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});await page.waitForTimeout(10000);}catch(e){pageErrors.push({message:'NAV '+e.message,stack:null});}
  const scripts=await page.locator('script').evaluateAll(nodes=>nodes.map((s,index)=>({index,id:s.id||null,src:s.src||null,type:s.type||null,defer:s.defer,async:s.async,text:(s.textContent||'').trim().slice(0,5000)})).filter(x=>/jquery|elementor|rocket|ekit|gum|owl/i.test(`${x.id||''} ${x.src||''} ${x.text||''}`)));
  result.http_status=response?.status()||0;
  result.scripts=scripts;
  result.page_errors=pageErrors;
  result.console_errors=consoleErrors;
  result.failed_requests=failedRequests;
  result.bad_responses=badResponses;
  result.globals=await page.evaluate(()=>({jqueryType:typeof window.jQuery,dollarType:typeof window.$,jqueryUiType:typeof window.jQuery?.ui,jqueryVersion:window.jQuery?.fn?.jquery||null}));
  result.status='success';
  await context.close();
}catch(e){result.error=String(e?.stack||e);}finally{
  if(browser)await browser.close().catch(()=>{});
  result.completed_at=new Date().toISOString();
  fs.writeFileSync(path.join(outDir,'result.json'),JSON.stringify(result,null,2)+'\n');
}
console.log(JSON.stringify({status:result.status,http_status:result.http_status,globals:result.globals,page_errors:result.page_errors,scripts:result.scripts},null,2));
if(result.status!=='success')process.exit(1);
