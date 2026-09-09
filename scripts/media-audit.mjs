#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const baseUrl = process.argv[2];
const outputDir = process.argv[3];
if (!baseUrl || !outputDir) throw new Error('Usage: node scripts/media-audit.mjs <base-url> <output-dir>');

const root = new URL(baseUrl);
if (!['http:', 'https:'].includes(root.protocol)) throw new Error('Target must be http(s).');
fs.mkdirSync(outputDir, { recursive: true });

const stripHtml = (value = '') => String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const escapeXml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');
const shorten = (value, max = 42) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};
const getFilename = (url) => {
  try { return decodeURIComponent(new URL(url).pathname.split('/').pop() || ''); } catch { return ''; }
};

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'Webactueel-Designchecker/0.3 media-audit' }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return { data: await res.json(), headers: res.headers };
}

const fields = 'id,title,alt_text,caption,description,source_url,mime_type,media_details,post,slug';
const api = new URL('/wp-json/wp/v2/media', root);
api.searchParams.set('media_type', 'image');
api.searchParams.set('per_page', '100');
api.searchParams.set('_fields', fields);
api.searchParams.set('page', '1');

const first = await fetchJson(api);
const pages = Number(first.headers.get('x-wp-totalpages') || 1);
const total = Number(first.headers.get('x-wp-total') || first.data.length);
const items = [...first.data];
for (let p = 2; p <= pages; p += 1) {
  const u = new URL(api);
  u.searchParams.set('page', String(p));
  const next = await fetchJson(u);
  items.push(...next.data);
}

const rows = items.map((item) => {
  const title = stripHtml(item.title?.rendered || item.title?.raw || '');
  const caption = stripHtml(item.caption?.rendered || item.caption?.raw || '');
  const description = stripHtml(item.description?.rendered || item.description?.raw || '');
  const filename = getFilename(item.source_url);
  const genericTitle = /^(acd cleaning (voertuigverzorging|beeld bij|achtergrondafbeelding|tijdelijke afbeelding|grafisch element|favicon)|ondersteunend stockbeeld|portret van een (man|vrouw))\b/i.test(title);
  const genericFilename = /(stockbeeld|placeholder|grafisch-element|favicon|acd-cleaning-voertuigverzorging-\d+|acd-cleaning-beeld-bij)/i.test(filename);
  return {
    id: item.id,
    title,
    alt_text: String(item.alt_text || '').trim(),
    caption,
    description,
    source_url: item.source_url,
    filename,
    slug: item.slug || '',
    post: item.post || null,
    mime_type: item.mime_type || '',
    width: item.media_details?.width || null,
    height: item.media_details?.height || null,
    filesize: item.media_details?.filesize || null,
    flags: {
      missing_alt: !String(item.alt_text || '').trim(),
      missing_caption: !caption,
      missing_description: !description,
      generic_title: genericTitle,
      generic_filename: genericFilename,
      placeholder_or_stock: /(stockbeeld|placeholder|tijdelijke afbeelding)/i.test(`${title} ${filename}`),
      favicon_or_graphic: /(favicon|grafisch element|achtergrondafbeelding)/i.test(`${title} ${filename}`)
    }
  };
});

const downloadDir = path.join(outputDir, 'images');
fs.mkdirSync(downloadDir, { recursive: true });
const thumbDir = path.join(outputDir, 'thumbs');
fs.mkdirSync(thumbDir, { recursive: true });

let cursor = 0;
const workers = Array.from({ length: 6 }, async () => {
  while (true) {
    const index = cursor++;
    if (index >= rows.length) return;
    const row = rows[index];
    try {
      const res = await fetch(row.source_url, { headers: { 'user-agent': 'Webactueel-Designchecker/0.3 media-audit' }, signal: AbortSignal.timeout(45000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      row.sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
      row.download_bytes = buffer.length;
      const meta = await sharp(buffer, { failOn: 'none' }).metadata();
      row.actual_width = meta.width || null;
      row.actual_height = meta.height || null;
      row.actual_format = meta.format || null;
      const thumbPath = path.join(thumbDir, `${String(index + 1).padStart(3, '0')}-${row.id}.jpg`);
      await sharp(buffer, { failOn: 'none' })
        .rotate()
        .resize(260, 160, { fit: 'contain', background: '#ffffff' })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 78 })
        .toFile(thumbPath);
      row.thumb_path = path.relative(outputDir, thumbPath).replaceAll('\\', '/');
      row.download_ok = true;
    } catch (error) {
      row.download_ok = false;
      row.download_error = error instanceof Error ? error.message : String(error);
    }
  }
});
await Promise.all(workers);

const hashGroups = new Map();
for (const row of rows) {
  if (!row.sha256) continue;
  const group = hashGroups.get(row.sha256) || [];
  group.push(row.id);
  hashGroups.set(row.sha256, group);
}
const duplicateGroups = [...hashGroups.entries()]
  .filter(([, ids]) => ids.length > 1)
  .map(([sha256, ids]) => ({ sha256, ids }));

const countFlag = (name) => rows.filter((row) => row.flags[name]).length;
const summary = {
  target: root.origin,
  rest_total_images: total,
  retrieved_images: rows.length,
  downloaded_images: rows.filter((row) => row.download_ok).length,
  failed_downloads: rows.filter((row) => !row.download_ok).length,
  missing_alt: countFlag('missing_alt'),
  missing_caption: countFlag('missing_caption'),
  missing_description: countFlag('missing_description'),
  generic_title: countFlag('generic_title'),
  generic_filename: countFlag('generic_filename'),
  placeholder_or_stock: countFlag('placeholder_or_stock'),
  favicon_or_graphic: countFlag('favicon_or_graphic'),
  exact_duplicate_groups: duplicateGroups.length,
  exact_duplicate_items: duplicateGroups.reduce((sum, group) => sum + group.ids.length, 0)
};

fs.writeFileSync(path.join(outputDir, 'media-inventory.json'), `${JSON.stringify({ summary, duplicate_groups: duplicateGroups, media: rows }, null, 2)}\n`);

const csvEscape = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
const csvHeaders = ['id','filename','title','alt_text','caption','description','post','source_url','actual_width','actual_height','download_ok','missing_alt','missing_caption','missing_description','generic_title','generic_filename','placeholder_or_stock','favicon_or_graphic'];
const csvLines = [csvHeaders.join(',')];
for (const row of rows) {
  const values = csvHeaders.map((h) => h in row.flags ? row.flags[h] : row[h]);
  csvLines.push(values.map(csvEscape).join(','));
}
fs.writeFileSync(path.join(outputDir, 'media-inventory.csv'), `${csvLines.join('\n')}\n`);

const cellW = 280;
const cellH = 220;
const imageH = 160;
const cols = 5;
const perSheet = 25;
const sheets = [];
for (let start = 0; start < rows.length; start += perSheet) {
  const subset = rows.slice(start, start + perSheet);
  const sheetRows = Math.ceil(subset.length / cols);
  const width = cols * cellW;
  const height = sheetRows * cellH;
  const composites = [];
  for (let i = 0; i < subset.length; i += 1) {
    const row = subset[i];
    const x = (i % cols) * cellW;
    const y = Math.floor(i / cols) * cellH;
    if (row.thumb_path) {
      composites.push({ input: path.join(outputDir, row.thumb_path), left: x + 10, top: y + 5 });
    }
    const label1 = escapeXml(`#${row.id} ${shorten(row.filename, 36)}`);
    const label2 = escapeXml(shorten(row.title, 39));
    const altMark = row.flags.missing_alt ? 'ALT: MISSING' : `ALT: ${shorten(row.alt_text, 34)}`;
    const label3 = escapeXml(altMark);
    const svg = Buffer.from(`<svg width="${cellW}" height="${cellH - imageH}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ffffff"/><text x="8" y="17" font-size="12" font-family="Arial" fill="#111111">${label1}</text><text x="8" y="34" font-size="12" font-family="Arial" fill="#111111">${label2}</text><text x="8" y="51" font-size="11" font-family="Arial" fill="#333333">${label3}</text></svg>`);
    composites.push({ input: svg, left: x, top: y + imageH });
  }
  const sheetPath = path.join(outputDir, `contact-sheet-${String(Math.floor(start / perSheet) + 1).padStart(2, '0')}.png`);
  await sharp({ create: { width, height, channels: 3, background: '#f2f2f2' } })
    .composite(composites)
    .png()
    .toFile(sheetPath);
  sheets.push(path.basename(sheetPath));
}
summary.contact_sheets = sheets;
fs.writeFileSync(path.join(outputDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(summary)}\n`);
