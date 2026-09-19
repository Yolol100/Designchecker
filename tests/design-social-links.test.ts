import test from 'node:test';
import assert from 'node:assert/strict';
import { isKnownSocialHostname, SOCIAL_HOSTS } from '../src/tools/design.js';

test('social hostname classifier recognizes supported public networks', () => {
  for (const host of ['instagram.com', 'www.instagram.com', 'm.facebook.com', 'linkedin.com', 'www.tiktok.com', 'youtube.com', 'www.threads.net']) {
    assert.equal(isKnownSocialHostname(host), true, host);
  }
});

test('social hostname classifier rejects unrelated hosts and lookalikes', () => {
  for (const host of ['example.com', 'instagram.com.example.org', 'notlinkedin.com', 'multifurn.nl']) {
    assert.equal(isKnownSocialHostname(host), false, host);
  }
});

test('social host registry covers the prospect networks used by Leads evidence routing', () => {
  for (const host of ['instagram.com', 'facebook.com', 'linkedin.com', 'tiktok.com']) {
    assert.ok(SOCIAL_HOSTS.includes(host as (typeof SOCIAL_HOSTS)[number]), host);
  }
});
