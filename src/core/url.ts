import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

function isPrivateIpv4(host: string): boolean {
  const parts = host.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return true;
  const [a, b, c] = parts as [number, number, number, number];
  return a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224;
}

function isPrivateIpv6(host: string): boolean {
  const normalized = host.toLowerCase();
  if (normalized === '::' || normalized === '::1') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (/^fe[89ab]/.test(normalized)) return true;
  if (normalized.startsWith('ff')) return true;
  if (normalized.startsWith('2001:db8:')) return true;
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? isPrivateIpv4(mapped[1] ?? '') : false;
}

export function isBlockedAddress(host: string): boolean {
  const normalized = host.toLowerCase().replace(/^\[|\]$/g, '');
  const version = isIP(normalized);
  if (version === 4) return isPrivateIpv4(normalized);
  if (version === 6) return isPrivateIpv6(normalized);
  return false;
}

export function assertSafeTarget(input: string): URL {
  const url = new URL(input);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only http and https targets are allowed.');

  const allowPrivate = process.env.ALLOW_PRIVATE_TARGETS === '1';
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const localName = hostname === 'localhost' || hostname.endsWith('.localhost');
  if (!allowPrivate && (localName || isBlockedAddress(hostname))) {
    throw new Error('Private/local targets are blocked. Set ALLOW_PRIVATE_TARGETS=1 only for intentional local or staging tests.');
  }
  return url;
}

export async function assertPublicTarget(input: string): Promise<URL> {
  const url = assertSafeTarget(input);
  if (process.env.ALLOW_PRIVATE_TARGETS === '1') return url;
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (isIP(hostname)) return url;
  const records = await lookup(hostname, { all: true, verbatim: true });
  if (records.length === 0) throw new Error('Target hostname did not resolve.');
  for (const record of records) {
    if (isBlockedAddress(record.address)) throw new Error(`Target hostname resolves to blocked address ${record.address}.`);
  }
  return url;
}
