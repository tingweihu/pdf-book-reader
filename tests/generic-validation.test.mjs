import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectPdfFile} from '../scripts/inspect-pdf.mjs';
import {normalizeBookConfig, safeUrl} from '../src/config/bookSchema.js';
import {applyLayoutOverrides} from '../src/config/bookNavigation.js';
import {browserTitle, readerTitle} from '../src/config/displayMetadata.js';
import {loadBookConfig} from '../src/config/loadBookConfig.js';
import {createReadingUnits} from '../src/reader/readingUnits.js';

const fixture = new URL('./fixtures/generic-validation.pdf', import.meta.url);

test('generic title is neutral and a configured title overrides it', () => {
  assert.equal(readerTitle(null), 'PDF Book Reader');
  assert.equal(browserTitle(null), 'PDF Book Reader');
  assert.equal(readerTitle(normalizeBookConfig({title: 'Field Guide'}, 3).config), 'Field Guide');
  assert.equal(browserTitle(normalizeBookConfig({title: 'Field Guide'}, 3).config), 'Field Guide — PDF Book Reader');
});

test('demo-bound metadata is ignored when only the PDF is replaced', () => {
  const raw = {title: 'A Different Book', pdfFingerprint: 'demo-document'};
  const matching = normalizeBookConfig(raw, 3, 'demo-document');
  assert.equal(readerTitle(matching.config), 'A Different Book');
  const replaced = normalizeBookConfig(raw, 3, 'replacement-document');
  assert.equal(replaced.config, null);
  assert.equal(readerTitle(replaced.config), 'PDF Book Reader');
  assert.match(replaced.warnings[0], /different PDF/);
});

test('a static-host HTML fallback for absent config is treated as zero-config', async () => {
  const loaded = await loadBookConfig(3, async () => ({
    status: 200,
    ok: true,
    headers: {get: () => 'text/html; charset=utf-8'},
    json: async () => { throw new Error('HTML is not JSON'); },
  }));
  assert.equal(loaded.config, null);
  assert.deepEqual(loaded.warnings, []);
});

test('unrelated PDF measures as three pages without reader code changes', async () => {
  const pages = await inspectPdfFile(fixture);
  assert.deepEqual(pages.map(({width, height, orientation, displayMode}) =>
    [width, height, orientation, displayMode]), [
    [612, 792, 'portrait', 'single'],
    [900, 600, 'landscape', 'spread'],
    [1200, 600, 'landscape', 'spread'],
  ]);
});

test('landscape single override stays full while spread override creates left/right', async () => {
  const pages = await inspectPdfFile(fixture);
  const {config, warnings} = normalizeBookConfig({layoutOverrides: [
    {page: 2, mode: 'single'},
    {page: 3, mode: 'spread'},
  ]}, pages.length);
  assert.deepEqual(warnings, []);
  const effective = applyLayoutOverrides(pages, config.layoutOverrides);
  assert.deepEqual(createReadingUnits(effective, 'narrow'), [
    {pdfPage: 1, segment: 'full'},
    {pdfPage: 2, segment: 'full'},
    {pdfPage: 3, segment: 'left'},
    {pdfPage: 3, segment: 'right'},
  ]);
  assert.equal(createReadingUnits(effective, 'desktop').length, 3);
});

test('unsafe public download URLs are rejected without removing the PDF', () => {
  for (const href of ['javascript:alert(1)', 'data:text/plain,hello', '//other.example/file.pdf',
    'https://user:pass@example.com/file.pdf', 'file:///private.pdf']) {
    assert.equal(safeUrl(href), null);
  }
  const {config, warnings} = normalizeBookConfig({downloads: [
    {label: 'Unsafe', href: 'javascript:alert(1)'},
    {label: 'PDF', href: '/book.pdf'},
  ]}, 3);
  assert.deepEqual(config.downloads, [{label: 'PDF', href: '/book.pdf'}]);
  assert.equal(warnings.length, 1);
});
