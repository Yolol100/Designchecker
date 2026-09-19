import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyPublicPageAccessBarrier } from '../src/core/browser.js';

test('detects Cloudflare security verification without treating it as prospect content', () => {
  const result = classifyPublicPageAccessBarrier({
    title: 'Just a moment...',
    bodyText: 'www.example.nl Performing security verification This website uses a security service powered by Cloudflare.',
    html: '<main id="challenge-stage"><a href="https://www.cloudflare.com/">Cloudflare</a></main>',
    url: 'https://www.example.nl/'
  });
  assert.equal(result.blocked, true);
  assert.equal(result.kind, 'cloudflare_challenge');
});

test('detects gateway access denied pages', () => {
  const result = classifyPublicPageAccessBarrier({
    title: 'Access Denied',
    bodyText: 'Access Denied Reference #18.abc',
    html: '<html><body>akamai</body></html>',
    url: 'https://www.example.nl/'
  });
  assert.equal(result.blocked, true);
  assert.equal(result.kind, 'access_denied');
});

test('does not classify normal commercial copy as an access barrier', () => {
  const result = classifyPublicPageAccessBarrier({
    title: 'Studio Example',
    bodyText: 'We design brands and websites. Contact us for a proposal.',
    html: '<html><body><main>Studio Example</main></body></html>',
    url: 'https://www.example.nl/'
  });
  assert.equal(result.blocked, false);
  assert.equal(result.kind, null);
});
