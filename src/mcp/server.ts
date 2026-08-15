import http from 'node:http';
import path from 'node:path';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { toNodeHandler } from '@modelcontextprotocol/node';
import * as z from 'zod/v4';
import {
  captureDesignBaseline,
  checkLinks,
  collectQaEvidence,
  compareScreenshots,
  inspectDesign,
  inspectElementor,
  inspectLeadSite,
  inspectSeo,
  runLighthouse,
  scanAccessibility,
  validateHtml
} from '../tools/index.js';

const urlSchema = z.string().url().describe('Public http/https URL to inspect.');
const artifactSchema = z.string().min(1).max(160).describe('Path relative to the configured server artifact directory.');
const asText = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] });
const artifactRoot = path.resolve(process.env.ARTIFACT_DIR ?? 'artifacts');

function artifactPath(relative: string): string {
  if (path.isAbsolute(relative)) throw new Error('Artifact paths must be relative.');
  const resolved = path.resolve(artifactRoot, relative);
  const prefix = `${artifactRoot}${path.sep}`;
  if (resolved !== artifactRoot && !resolved.startsWith(prefix)) throw new Error('Artifact path escapes the configured artifact directory.');
  return resolved;
}

function routedDescription(owner: string, project: string, purpose: string): string {
  return `Owner=${owner}; project=${project}. Use only after webactueel-workflow has resolved this domain owner and, for project-specific work, selected the task-relevant live Google Drive project sources. ${purpose}`;
}

function createServer() {
  const server = new McpServer(
    { name: 'webactueel-evidence', version: '0.2.0' },
    { capabilities: { tools: {} }, instructions: 'Read-only target-evidence layer. Routing order is goal -> domain owner -> live project source -> task-relevant selector -> capability -> tool -> evidence. Capabilities never become a second domain owner. Never infer production GO, WCAG conformance, ranking gains, conversion gains or permission to mutate a target from these results.' }
  );

  server.registerTool('design_inspect_page', { description: routedDescription('design', 'project-design', 'Collect rendered hierarchy, design-system, CTA/form and overflow signals.'), inputSchema: z.object({ url: urlSchema }) }, async ({ url }) => asText(await inspectDesign(url)));
  server.registerTool('design_accessibility_risks', { description: routedDescription('design', 'project-design', 'Run axe-core as an automated design-accessibility risk signal; not a WCAG conformance test.'), inputSchema: z.object({ url: urlSchema }) }, async ({ url }) => asText(await scanAccessibility(url)));
  server.registerTool('design_capture_baseline', { description: routedDescription('design', 'project-design', 'Capture desktop/tablet/mobile screenshots into the server artifact directory for a Design baseline.'), inputSchema: z.object({ url: urlSchema, name: artifactSchema.default('design-baseline') }) }, async ({ url, name }) => asText(await captureDesignBaseline(url, artifactPath(name))));
  server.registerTool('design_compare_screenshots', { description: routedDescription('design', 'project-design', 'Compare two server artifact screenshots for visual regression; paths are relative to ARTIFACT_DIR.'), inputSchema: z.object({ before: artifactSchema, after: artifactSchema, diff: artifactSchema }) }, async ({ before, after, diff }) => asText(await compareScreenshots(artifactPath(before), artifactPath(after), artifactPath(diff))));

  server.registerTool('seo_inspect_page', { description: routedDescription('seo', 'project-seo', 'Inspect rendered on-page SEO, canonical/robots, headings, images, links, Open Graph and JSON-LD presence.'), inputSchema: z.object({ url: urlSchema }) }, async ({ url }) => asText(await inspectSeo(url)));
  server.registerTool('seo_check_links', { description: routedDescription('seo', 'project-seo', 'Check a bounded sample of rendered HTTP links with private/local literal targets and redirects blocked.'), inputSchema: z.object({ url: urlSchema, maxLinks: z.number().int().min(1).max(100).default(40) }) }, async ({ url, maxLinks }) => asText(await checkLinks(url, maxLinks)));
  server.registerTool('seo_performance_lab', { description: routedDescription('seo', 'project-seo', 'Run Lighthouse as SEO measurement support. This is lab data, not field CWV.'), inputSchema: z.object({ url: urlSchema }) }, async ({ url }) => asText(await runLighthouse(url, 'seo', 'seo_performance_lab')));
  server.registerTool('seo_validate_html', { description: routedDescription('seo', 'project-seo', 'Run Nu HTML Checker as technical-SEO markup evidence.'), inputSchema: z.object({ url: urlSchema }) }, async ({ url }) => asText(await validateHtml(url, 'seo', 'seo_validate_html')));

  server.registerTool('elementor_inspect_page', { description: routedDescription('elementor', 'project-elementor', 'Detect rendered Elementor containers, legacy sections/columns, widgets and responsive-hidden signals.'), inputSchema: z.object({ url: urlSchema }) }, async ({ url }) => asText(await inspectElementor(url)));
  server.registerTool('elementor_capture_baseline', { description: routedDescription('elementor', 'project-elementor', 'Capture rendered responsive evidence before/after Elementor work; this does not inspect editor data.'), inputSchema: z.object({ url: urlSchema, name: artifactSchema.default('elementor-baseline') }) }, async ({ url, name }) => asText(await captureDesignBaseline(url, artifactPath(name), undefined, 'elementor', 'elementor_capture_baseline')));

  server.registerTool('wordpress_performance_lab', { description: routedDescription('wordpressqualityarchitect', 'project-plugin', 'Run Lighthouse as implementation/performance diagnostic evidence; not a production GO claim.'), inputSchema: z.object({ url: urlSchema }) }, async ({ url }) => asText(await runLighthouse(url, 'wordpressqualityarchitect', 'wordpress_performance_lab')));
  server.registerTool('wordpress_validate_html', { description: routedDescription('wordpressqualityarchitect', 'project-plugin', 'Validate rendered frontend markup during WordPress implementation/release work.'), inputSchema: z.object({ url: urlSchema }) }, async ({ url }) => asText(await validateHtml(url, 'wordpressqualityarchitect', 'wordpress_validate_html')));

  server.registerTool('lead_inspect_public_site', { description: routedDescription('leads', 'project-leads', 'Use only after the Leads workflow has checked the persistent Lead Registry. Collect public contact/company signals only; never qualify, enrich privately, draft or send email by itself.'), inputSchema: z.object({ url: urlSchema }) }, async ({ url }) => asText(await inspectLeadSite(url)));

  server.registerTool('qa_collect_page_evidence', { description: routedDescription('website-qa-checklist', 'project-checklist', 'Collect an independent bounded page-evidence bundle. This does not issue GO/No-Go.'), inputSchema: z.object({ url: urlSchema }) }, async ({ url }) => asText(await collectQaEvidence(url)));
  server.registerTool('qa_accessibility_risks', { description: routedDescription('website-qa-checklist', 'project-checklist', 'Run an independent axe-core scan; manual keyboard/screenreader/AT coverage remains separate.'), inputSchema: z.object({ url: urlSchema }) }, async ({ url }) => asText(await scanAccessibility(url, 'website-qa-checklist', 'qa_accessibility_risks')));
  server.registerTool('qa_performance_lab', { description: routedDescription('website-qa-checklist', 'project-checklist', 'Run an independent Lighthouse lab retest; field CWV remains separate.'), inputSchema: z.object({ url: urlSchema }) }, async ({ url }) => asText(await runLighthouse(url, 'website-qa-checklist', 'qa_performance_lab')));
  server.registerTool('qa_validate_html', { description: routedDescription('website-qa-checklist', 'project-checklist', 'Run independent rendered markup validation within touched QA scope.'), inputSchema: z.object({ url: urlSchema }) }, async ({ url }) => asText(await validateHtml(url, 'website-qa-checklist', 'qa_validate_html')));
  server.registerTool('qa_check_links', { description: routedDescription('website-qa-checklist', 'project-checklist', 'Run an independent bounded link-regression check.'), inputSchema: z.object({ url: urlSchema, maxLinks: z.number().int().min(1).max(100).default(40) }) }, async ({ url, maxLinks }) => asText(await checkLinks(url, maxLinks, 'website-qa-checklist', 'qa_check_links')));
  server.registerTool('qa_capture_baseline', { description: routedDescription('website-qa-checklist', 'project-checklist', 'Capture responsive QA screenshot evidence into the server artifact directory.'), inputSchema: z.object({ url: urlSchema, name: artifactSchema.default('qa-baseline') }) }, async ({ url, name }) => asText(await captureDesignBaseline(url, artifactPath(name), undefined, 'website-qa-checklist', 'qa_capture_baseline')));
  server.registerTool('qa_compare_screenshots', { description: routedDescription('website-qa-checklist', 'project-checklist', 'Compare QA screenshots for visual regression; paths are relative to ARTIFACT_DIR.'), inputSchema: z.object({ before: artifactSchema, after: artifactSchema, diff: artifactSchema }) }, async ({ before, after, diff }) => asText(await compareScreenshots(artifactPath(before), artifactPath(after), artifactPath(diff), 'website-qa-checklist', 'qa_compare_screenshots')));
  return server;
}

function csvSet(value: string): Set<string> {
  return new Set(value.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean));
}

function requestAllowed(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  const allowedHosts = csvSet(process.env.MCP_ALLOWED_HOSTS ?? 'localhost,127.0.0.1,::1');
  const rawHost = req.headers.host ?? '';
  const host = rawHost.startsWith('[') ? rawHost.slice(1, rawHost.indexOf(']')) : (rawHost.split(':')[0] ?? '');
  if (!allowedHosts.has(host.toLowerCase())) {
    res.writeHead(403, { 'content-type': 'text/plain' });
    res.end('Host not allowed');
    return false;
  }
  const originHeader = req.headers.origin;
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
  const allowedOrigins = csvSet(process.env.MCP_ALLOWED_ORIGINS ?? '');
  if (origin && allowedOrigins.size > 0 && !allowedOrigins.has(origin.toLowerCase())) {
    res.writeHead(403, { 'content-type': 'text/plain' });
    res.end('Origin not allowed');
    return false;
  }
  return true;
}

async function main() {
  const transport = process.env.MCP_TRANSPORT ?? 'http';
  if (transport === 'stdio') {
    await serveStdio(createServer);
    return;
  }
  const handler = createMcpHandler(createServer);
  const nodeHandler = toNodeHandler(handler);
  const port = Number(process.env.PORT ?? 8787);
  const host = process.env.HOST ?? '127.0.0.1';
  http.createServer((req, res) => {
    if (!requestAllowed(req, res)) return;
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, service: 'webactueel-evidence', artifactRoot }));
      return;
    }
    if (req.url?.startsWith('/mcp')) {
      void nodeHandler(req, res);
      return;
    }
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found');
  }).listen(port, host, () => console.error(`Webactueel Evidence MCP listening on http://${host}:${port}/mcp`));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
