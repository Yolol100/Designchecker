import assert from 'node:assert/strict';
import test from 'node:test';
import { collectStructuredSocialLinks } from '../src/tools/design.js';

test('collects official social profiles from matching Organization sameAs', () => {
  const blocks = [JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': 'https://example.com/#organization',
    url: 'https://example.com/',
    sameAs: ['https://www.instagram.com/example/', 'https://www.linkedin.com/company/example/']
  })];

  assert.deepEqual(collectStructuredSocialLinks(blocks, 'www.example.com'), [
    {
      href: 'https://www.instagram.com/example/',
      hostname: 'www.instagram.com',
      source: 'jsonld_sameAs',
      schemaType: 'Organization'
    },
    {
      href: 'https://www.linkedin.com/company/example/',
      hostname: 'www.linkedin.com',
      source: 'jsonld_sameAs',
      schemaType: 'Organization'
    }
  ]);
});

test('ignores unrelated Organization identity, invalid JSON-LD and non-social sameAs', () => {
  const blocks = [
    '{not-json',
    JSON.stringify({
      '@type': 'Organization',
      url: 'https://other.example/',
      sameAs: ['https://www.facebook.com/unrelated']
    }),
    JSON.stringify({
      '@type': 'Organization',
      url: 'https://example.com/',
      sameAs: ['https://example.net/about', 'javascript:alert(1)']
    })
  ];

  assert.deepEqual(collectStructuredSocialLinks(blocks, 'example.com'), []);
});

test('collects matching organization entities nested inside @graph', () => {
  const blocks = [JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', url: 'https://example.com/' },
      {
        '@type': 'LocalBusiness',
        '@id': 'https://example.com/#business',
        sameAs: 'https://www.tiktok.com/@example'
      }
    ]
  })];

  assert.deepEqual(collectStructuredSocialLinks(blocks, 'example.com'), [
    {
      href: 'https://www.tiktok.com/@example',
      hostname: 'www.tiktok.com',
      source: 'jsonld_sameAs',
      schemaType: 'LocalBusiness'
    }
  ]);
});
