import http from 'node:http';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { localhostHostValidation, localhostOriginValidation, toNodeHandler } from '@modelcontextprotocol/node';
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
const asText = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] });

function createServer() {
  const server = new McpServer(
    { name: 'webactueel-evidence', version: '0.1.0' },
    { capabilities: { tools: {} }, instructions: 'Read-only evidence collection for Webactueel specialist skills. Never infer production GO, WCAG conformance, ranking gains, conversion gains or permission to mutate a target from these results.' }
  );

  server.registerTool('design_inspect_page', { description: 'Collect rendered design-system, hierarchy, CTA/form and overflow signals for the Design owner.', inputSchema: z.object({ url: urlSchema }) }, async ({ url }) => asText(await inspectDesign(url)));
  server.registerTool('design_accessibility_risks', { description: 'Run axe-core and return automated accessibility risks. This is not a WCAG conformance test.', inputSchema: z.object({ url: urlSchema }) }, async ({ url }) => asText(await scanAccessibility(url)));
  server.registerTool('design_capture_baseline', { description: 'Capture desktop/tablet/mobile screenshots to a server-local directory.', inputSchema: z.object({ url: urlSchema, outputDir: z.string().min(1) }) }, async ({ url, outputDir }) => asText(await captureDesignBaseline(url, outputDir)));
  server.registerTool('design_compare_screenshots', { description: 'Create a pixel diff between two same-sized local screenshots.', inputSchema: z.object({ beforePath: z.string().min(1), afterPath: z.string().min(1), diffPath: z.string().min(1) }) }, async ({ beforePath, afterPath, diffPath }) => asText(await compareScreenshots(beforePath, afterPath, diffPath)));
  server.registerTool('seo_inspect_page', { description: 'Inspect title, description, headings, canonical, robots, images, links, Open Graph and JSON-LD.', inputSchema: z.object({ url: urlSchema }) }, async ({ url }) => asText(await inspectSeo(url)));
  server.registerTool('seo_check_links', { description: 'Check a bounded sample of rendered HTTP links without external services.', inputSchema: z.object({ url: urlSchema, maxLinks: z.number().int().min(1).max(100).default(40) }) }, async ({ url, maxLinks }) => asText(await checkLinks(url, maxLinks)));
  server.registerTool('elementor_inspect_page', { description: 'Detect rendered Elementor structure, containers, legacy sections/columns, widgets and responsive-hidden signals.', inputSchema: z.object({ url: urlSchema }) }, async ({ url }) => asText(await inspectElementor(url)));
  server.registerTool('lead_inspect_public_site', { description: 'Collect public contact and company-site signals only. No lead qualification, enrichment, drafting or email sending.', inputSchema: z.object({ url: urlSchema }) }, async ({ url }) => asText(await inspectLeadSite(url)));
  server.registerTool('performance_lighthouse', { description: 'Run a local Lighthouse lab audit using Playwright Chromium.', inputSchema: z.object({ url: urlSchema }) }, async ({ url }) => asText(await runLighthouse(url)));
  server.registerTool('html_validate_url', { description: 'Validate a public URL with the local Nu HTML Checker package.', inputSchema: z.object({ url: urlSchema }) }, async ({ url }) => asText(await validateHtml(url)));
  server.registerTool('qa_collect_page_evidence', { description: 'Bundle Design, axe, SEO, links and Elementor evidence for Website QA. Does not issue a GO decision.', inputSchema: z.object({ url: urlSchema }) }, async ({ url }) => asText(await collectQaEvidence(url)));
  return server;
}

async function main() {
  const transport = process.env.MCP_TRANSPORT ?? 'http';
  if (transport === 'stdio') {
    await serveStdio(createServer);
    return;
  }
  const handler = createMcpHandler(createServer);
  const nodeHandler = toNodeHandler(handler);
  const validateHost = localhostHostValidation();
  const validateOrigin = localhostOriginValidation();
  const port = Number(process.env.PORT ?? 8787);
  http.createServer((req, res) => {
    if (!validateHost(req, res) || !validateOrigin(req, res)) return;
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, service: 'webactueel-evidence' }));
      return;
    }
    if (req.url?.startsWith('/mcp')) {
      void nodeHandler(req, res);
      return;
    }
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found');
  }).listen(port, '127.0.0.1', () => console.error(`Webactueel Evidence MCP listening on http://127.0.0.1:${port}/mcp`));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
