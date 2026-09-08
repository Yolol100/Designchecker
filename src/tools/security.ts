import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { evidence } from '../core/evidence.js';
import { resolvePublicTarget } from '../core/url.js';

const ZAP_IMAGE = 'ghcr.io/zaproxy/zaproxy:2.17.0';
const TESTSSL_COMMIT = '97763a411c525720a5f9bd9d2cded416b10f210a';

function evidenceDir(): { absolute: string; relative: string } {
  const configured = process.env.WEBACTUEEL_EVIDENCE_DIR;
  const absolute = configured ? path.resolve(configured) : path.resolve('results', 'evidence', 'security-local');
  mkdirSync(absolute, { recursive: true });
  const relative = path.relative(process.cwd(), absolute).replaceAll('\\', '/');
  if (!relative || relative.startsWith('../') || path.isAbsolute(relative)) {
    throw new Error('Security evidence directory must remain inside the repository workspace.');
  }
  return { absolute, relative };
}

function artifactPath(root: { absolute: string; relative: string }, name: string): { absolute: string; relative: string } {
  return {
    absolute: path.join(root.absolute, name),
    relative: `${root.relative}/${name}`
  };
}

function readJson(file: string): unknown {
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, 'utf8'));
}

function pinnedRequest(url: URL, address: string, family: 4 | 6): Promise<{ status: number; location: string | null }> {
  const transport = url.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const request = transport.request(url, {
      method: 'GET',
      lookup: (_hostname, _options, callback) => callback(null, address, family),
      headers: { 'user-agent': 'Webactueel-Security-Preflight/1.0', accept: 'text/html,*/*;q=0.1' }
    }, (response) => {
      const status = response.statusCode ?? 0;
      const rawLocation = response.headers.location;
      const location = Array.isArray(rawLocation) ? rawLocation[0] ?? null : rawLocation ?? null;
      response.resume();
      resolve({ status, location });
    });
    request.setTimeout(15_000, () => request.destroy(new Error('Security target preflight timed out.')));
    request.on('error', reject);
    request.end();
  });
}

async function pinRedirectChain(input: string): Promise<{ url: URL; address: string; family: 4 | 6 }> {
  const resolved = await resolvePublicTarget(input);
  const originalHostname = resolved.url.hostname.toLowerCase();
  let current = resolved.url;
  for (let redirects = 0; redirects <= 5; redirects += 1) {
    const response = await pinnedRequest(current, resolved.address, resolved.family);
    if (response.status < 300 || response.status >= 400 || !response.location) {
      return { ...resolved, url: current };
    }
    if (redirects === 5) throw new Error('Security target exceeded the redirect limit.');
    const next = new URL(response.location, current);
    if (!['http:', 'https:'].includes(next.protocol)) throw new Error('Security target redirected to a non-HTTP(S) URL.');
    if (next.hostname.toLowerCase() !== originalHostname) {
      throw new Error('Security target redirected to another hostname; cross-host redirects are blocked for scanner safety.');
    }
    if (current.protocol === 'https:' && next.protocol !== 'https:') {
      throw new Error('Security target attempted an HTTPS-to-HTTP downgrade redirect.');
    }
    current = next;
  }
  throw new Error('Security target redirect preflight failed closed.');
}

export async function runZapBaseline(input: string) {
  const target = await pinRedirectChain(input);
  const out = evidenceDir();
  const json = artifactPath(out, 'zap-report.json');
  const markdown = artifactPath(out, 'zap-report.md');
  const html = artifactPath(out, 'zap-report.html');
  const dockerHost = target.url.hostname.replace(/^\[|\]$/g, '');
  const child = spawnSync('docker', [
    'run', '--rm',
    '--add-host', `${dockerHost}:${target.address}`,
    '-v', `${out.absolute}:/zap/wrk/:rw`,
    ZAP_IMAGE,
    'zap-baseline.py',
    '-t', target.url.toString(),
    '-J', path.basename(json.relative),
    '-w', path.basename(markdown.relative),
    '-r', path.basename(html.relative),
    '-I'
  ], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });

  if (child.error) throw child.error;
  const exitCode = child.status ?? 3;
  // With -I, warnings do not fail the command. Exit 1 may still represent configured FAIL findings.
  if (exitCode >= 2) throw new Error(`ZAP baseline execution failed (${exitCode}): ${child.stderr || child.stdout}`);

  return evidence({
    owner: 'website-qa-checklist',
    tool: 'qa_zap_baseline',
    target: input,
    status: exitCode === 0 ? 'ok' : 'partial',
    data: {
      version: '2.17.0',
      image: ZAP_IMAGE,
      scannedUrl: target.url.toString(),
      pinnedAddress: target.address,
      exitCode,
      artifacts: { json: json.relative, markdown: markdown.relative, html: html.relative },
      report: readJson(json.absolute),
      stderr: child.stderr?.trim() || null
    },
    limits: [
      'OWASP ZAP Baseline provides passive diagnostic signals; Website QA owns severity, acceptance and release decisions.',
      'The verified target hostname is pinned to the preflight public address and cross-host or downgrade redirects are rejected before scanning.',
      'The traditional baseline spider is limited to its target scope; this does not prove absence of vulnerabilities or security compliance.'
    ]
  });
}

export async function runTlsAudit(input: string) {
  const target = await pinRedirectChain(input);
  if (target.url.protocol !== 'https:') throw new Error('TLS audit requires an https target.');
  const out = evidenceDir();
  const tool = path.resolve('.tools', 'testssl', 'testssl.sh');
  if (!existsSync(tool)) throw new Error(`Pinned testssl.sh checkout is missing at ${tool}.`);
  const json = artifactPath(out, 'testssl-report.json');
  const log = artifactPath(out, 'testssl-report.log');
  const pinnedIp = target.family === 6 ? `[${target.address}]` : target.address;
  const child = spawnSync('bash', [
    tool,
    '--warnings', 'batch',
    '--nodns', 'min',
    '--ip', pinnedIp,
    '--jsonfile-pretty', json.absolute,
    '--logfile', log.absolute,
    target.url.toString()
  ], { encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 });

  if (child.error) throw child.error;
  const exitCode = child.status ?? 2;
  if (exitCode !== 0) throw new Error(`testssl.sh execution failed (${exitCode}): ${child.stderr || child.stdout}`);

  return evidence({
    owner: 'website-qa-checklist',
    tool: 'qa_testssl',
    target: input,
    data: {
      version: '3.2.4',
      commit: TESTSSL_COMMIT,
      scannedUrl: target.url.toString(),
      pinnedAddress: target.address,
      exitCode,
      artifacts: { json: json.relative, log: log.relative },
      report: readJson(json.absolute),
      stderr: child.stderr?.trim() || null
    },
    limits: [
      'testssl.sh provides TLS/certificate/protocol diagnostics; Website QA owns severity, remediation priority and release acceptance.',
      'The verified public address is passed with --ip and DNS is minimized to prevent scanner re-resolution of the target hostname.',
      'A successful tool run does not prove the endpoint is vulnerability-free or compliant with every external standard.'
    ]
  });
}
