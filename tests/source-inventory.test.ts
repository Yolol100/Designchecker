import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSourceAssetInventory, extractCssBackgroundUrls, normalizeSourceAssetUrl
} from '../src/core/source-inventory.js';

test('asset URLs are resolved, de-duplicated and stripped of sensitive query strings', () => {
  const result = buildSourceAssetInventory('https://example.com/about', [
    { kind: 'image', rawUrl: '/media/hero.jpg?token=private&width=1200#part', alt: 'Hero', width: 1200, height: 600, visible: true },
    { kind: 'image', rawUrl: 'https://example.com/media/hero.jpg?token=other', alt: 'Duplicate' },
    { kind: 'background', rawUrl: '../media/pattern.svg', visible: true },
    { kind: 'picture_source', rawUrl: '/media/mobile.jpg', media: '(max-width: 600px)' }
  ]);
  assert.equal(result.assets.length, 3);
  assert.equal(result.duplicates, 1);
  assert.deepEqual(result.assets[0], {
    kind: 'image', url: 'https://example.com/media/hero.jpg', queryStripped: true, alt: 'Hero',
    width: 1200, height: 600, visible: true, media: null
  });
  assert.equal(result.assets[2]?.media, '(max-width: 600px)');
});

test('unsafe or non-web asset references do not become evidence', () => {
  for (const value of [
    'data:image/png;base64,AA==', 'javascript:alert(1)', 'file:///etc/passwd',
    'http://localhost/image.png', 'http://127.0.0.1/a', 'http://10.1.2.3/x',
    'https://user:secret@example.com/image.png', 'https://[::1]/x', 'http://[not-ipv6]/'
  ]) {
    assert.equal(normalizeSourceAssetUrl(value, 'https://example.com/page'), null, value);
  }
  const result = buildSourceAssetInventory('https://example.com/', [
    { kind: 'image', rawUrl: 'data:image/svg+xml,AA' },
    { kind: 'image', rawUrl: '/ok.png' }
  ]);
  assert.equal(result.rejected, 1);
  assert.equal(result.assets.length, 1);
});

test('computed background URLs can be discovered without fetching them', () => {
  assert.deepEqual(extractCssBackgroundUrls('linear-gradient(red, blue), url("/hero.webp"),url(\'https://cdn.example.com/texture.png\')'), [
    '/hero.webp', 'https://cdn.example.com/texture.png'
  ]);
});

test('bounded inventory reports truncation and preserves original candidate count', () => {
  const candidates = Array.from({ length: 340 }, (_, i) => ({ kind: 'image' as const, rawUrl: '/image-' + i + '.png' }));
  const result = buildSourceAssetInventory('https://example.com/', candidates, 2);
  assert.equal(result.assets.length, 2);
  assert.equal(result.inspectedCandidates, 300);
  assert.equal(result.truncated, true);
});

test('absurd limit inputs are bounded instead of causing unbounded reports', () => {
  const candidates = Array.from({ length: 160 }, (_, i) => ({ kind: 'image' as const, rawUrl: '/image-' + i + '.png' }));
  const result = buildSourceAssetInventory('https://example.com/', candidates, Number.POSITIVE_INFINITY);
  assert.equal(result.assets.length, 120);
  assert.equal(result.truncated, true);
});
