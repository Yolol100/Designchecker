import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { assertPublicTarget } from '../core/url.js';

const ZAP_IMAGE = 'ghcr.io/zaproxy/zaproxy:2.17.0';
const TESTSSL_COMMIT = '97763a411c525720a5f9bd9d2cded416b10f210a';

function evidenceDir(): string {
  const configured = process.env.WEBACTUEEL_EVIDENCE_DIR;
  const root = configured ? path.resolve(configured) : path.resolve('results', 'evidence', 'security-local');
  mkdirSync(root, { recursive: true });
  return root;
}

function readJson(file: string): unknown {
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, 'utf8'));
}

export async function runZapBaseline(input: string) {
  const target = await assertPublicTarget(input);
  const out = evidenceDir();
  const jsonName = 'zap-report.json';
  const mdName = 'zap-report.md';
  const htmlName = 'zap-report.html';
  const child = spawnSync('docker', [
    'run', '--rm',
    '-v', `${out}:/zap/wrk/:rw`,
    ZAP_IMAGE,
    'zap-baseline.py',
    '-t', target.toString(),
    '-J', jsonName,
    '-w', mdName,
    '-r', htmlName,
    '-I'
  ], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });

  if (child.error) throw child.error;
  const exitCode = child.status ?? 2;
  // ZAP baseline exit 1 represents policy findings. Exit >=2 is an execution failure.
  if (exitCode >= 2) throw new Error(`ZAP baseline execution failed (${exitCode}): ${child.stderr || child.stdout}`);

  return {
    tool: 'owasp-zap-baseline',
    version: '2.17.0',
    image: ZAP_IMAGE,
    target: target.toString(),
    status: exitCode === 0 ? 'completed' : 'completed_with_findings',
    exit_code: exitCode,
    evidence: {
      json: path.join(out, jsonName),
      markdown: path.join(out, mdName),
      html: path.join(out, htmlName)
    },
    report: readJson(path.join(out, jsonName)),
    stderr: child.stderr?.trim() || null
  };
}

export async function runTlsAudit(input: string) {
  const target = await assertPublicTarget(input);
  if (target.protocol !== 'https:') throw new Error('TLS audit requires an https target.');
  const out = evidenceDir();
  const tool = path.resolve('.tools', 'testssl', 'testssl.sh');
  if (!existsSync(tool)) throw new Error(`Pinned testssl.sh checkout is missing at ${tool}.`);
  const jsonFile = path.join(out, 'testssl-report.json');
  const logFile = path.join(out, 'testssl-report.log');
  const child = spawnSync('bash', [
    tool,
    '--warnings', 'batch',
    '--jsonfile-pretty', jsonFile,
    '--logfile', logFile,
    target.toString()
  ], { encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 });

  if (child.error) throw child.error;
  const exitCode = child.status ?? 2;
  if (exitCode !== 0) throw new Error(`testssl.sh execution failed (${exitCode}): ${child.stderr || child.stdout}`);

  return {
    tool: 'testssl.sh',
    version: '3.2.4',
    commit: TESTSSL_COMMIT,
    target: target.toString(),
    status: 'completed',
    exit_code: exitCode,
    evidence: { json: jsonFile, log: logFile },
    report: readJson(jsonFile),
    stderr: child.stderr?.trim() || null
  };
}
