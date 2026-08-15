#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const input = process.argv[2];
if (!input) throw new Error('input_path is required.');
const normalized = path.normalize(input).replaceAll('\\','/');
if (!normalized.startsWith('requests/inputs/') || normalized.includes('../')) throw new Error('Input must be under requests/inputs/.');
const data = JSON.parse(fs.readFileSync(normalized,'utf8'));
const findings = [];
const stats = { elements:0, containers:0, sections:0, columns:0, widgets:0, unknown:0, widget_types:{}, ids:new Set() };

function visit(node, trail='root') {
  if (Array.isArray(node)) return node.forEach((item,i)=>visit(item,`${trail}[${i}]`));
  if (!node || typeof node !== 'object') return;
  const looksElement = 'elType' in node || 'elementType' in node || 'widgetType' in node || Array.isArray(node.elements);
  if (looksElement) {
    stats.elements++;
    const type = node.elType || node.elementType || (node.widgetType ? 'widget' : 'unknown');
    if (type === 'container') stats.containers++;
    else if (type === 'section') stats.sections++;
    else if (type === 'column') stats.columns++;
    else if (type === 'widget') stats.widgets++;
    else stats.unknown++;
    if (node.widgetType) stats.widget_types[node.widgetType] = (stats.widget_types[node.widgetType] || 0) + 1;
    if (node.id) {
      if (stats.ids.has(node.id)) findings.push({severity:'high',type:'duplicate_element_id',trail,id:node.id});
      stats.ids.add(node.id);
    }
    const htmlTag = node.settings?.html_tag || node.settings?.htmlTag;
    if (htmlTag && !/^(div|section|article|main|header|footer|nav|aside|ul|ol|li|a|button|form|label|h[1-6]|p|span)$/i.test(String(htmlTag))) findings.push({severity:'medium',type:'unusual_html_tag',trail,value:htmlTag});
    const url = node.settings?.link?.url || node.settings?.url;
    if (typeof url === 'string' && /^javascript:/i.test(url.trim())) findings.push({severity:'high',type:'javascript_url',trail});
  }
  for (const [key,value] of Object.entries(node)) if (key !== 'settings' || (value && typeof value === 'object')) visit(value,`${trail}.${key}`);
}
visit(data);
const top = { type:data.type ?? null, version:data.version ?? null, title:data.title ?? null, has_content:Array.isArray(data.content) || Array.isArray(data.elements) };
if (!top.has_content && !Array.isArray(data)) findings.push({severity:'medium',type:'unrecognized_elementor_content_shape'});
const format = stats.containers > 0 && (stats.sections > 0 || stats.columns > 0) ? 'mixed' : stats.containers > 0 ? 'container' : (stats.sections > 0 || stats.columns > 0) ? 'legacy' : 'unknown';
console.log(JSON.stringify({schema_version:'webactueel-elementor-json-audit/1.0',source:'Yolol100/Designchecker:scripts/elementor-json.mjs',input:normalized,top_level:top,format,stats:{...stats,ids:stats.ids.size},findings,limitations:['Static JSON structure audit only; target Elementor version/add-ons/site settings still require Project Elementor preflight.']}));
