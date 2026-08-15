import { isIP } from 'node:net';

function isPrivateIpv4(host: string): boolean {
  const parts = host.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;
  const [a, b] = parts as [number, number, number, number];
  return a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

export function assertSafeTarget(input: string): URL {
  const url = new URL(input);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only http and https targets are allowed.');

  const allowPrivate = process.env.ALLOW_PRIVATE_TARGETS === '1';
  const hostname = url.hostname.toLowerCase();
  const localName = hostname === 'localhost' || hostname.endsWith('.localhost');
  const privateIp = isIP(hostname) === 4 && isPrivateIpv4(hostname);
  const privateIpv6 = isIP(hostname) === 6 && (hostname === '::1' || hostname.startsWith('fc') || hostname.startsWith('fd'));

  if (!allowPrivate && (localName || privateIp || privateIpv6)) {
    throw new Error('Private/local targets are blocked. Set ALLOW_PRIVATE_TARGETS=1 only for intentional local or staging tests.');
  }
  return url;
}
