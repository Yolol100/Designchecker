import { isIP } from 'node:net';

function isPrivateIpv4(host: string): boolean {
  const parts = host.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;
  const [a, b] = parts as [number, number, number, number];
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function isPrivateIpv6(host: string): boolean {
  if (host === '::' || host === '::1') return true;
  if (host.startsWith('fc') || host.startsWith('fd')) return true;
  if (/^fe[89ab]/.test(host)) return true;
  const mapped = host.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? isPrivateIpv4(mapped[1] ?? '') : false;
}

export function assertSafeTarget(input: string): URL {
  const url = new URL(input);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only http and https targets are allowed.');

  const allowPrivate = process.env.ALLOW_PRIVATE_TARGETS === '1';
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const localName = hostname === 'localhost' || hostname.endsWith('.localhost');
  const ipVersion = isIP(hostname);
  const privateIp = ipVersion === 4 && isPrivateIpv4(hostname);
  const privateIpv6 = ipVersion === 6 && isPrivateIpv6(hostname);

  if (!allowPrivate && (localName || privateIp || privateIpv6)) {
    throw new Error('Private/local targets are blocked. Set ALLOW_PRIVATE_TARGETS=1 only for intentional local or staging tests.');
  }
  return url;
}
