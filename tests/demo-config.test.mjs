import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {getDocument, GlobalWorkerOptions} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {normalizeBookConfig} from '../src/config/bookSchema.js';
import {applyLayoutOverrides} from '../src/config/bookNavigation.js';
import {classifyPage} from '../src/reader/geometry.js';
import {createReadingUnits} from '../src/reader/readingUnits.js';

test('the approved demo metadata validates and preserves its 15-page geometry', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/EXAMPLE_BOOK.json', import.meta.url), 'utf8'));
  GlobalWorkerOptions.workerSrc = import.meta.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
  const loadingTask = getDocument({data: new Uint8Array(await readFile(new URL('../public/EXAMPLE_BOOK.pdf', import.meta.url)))});
  let fingerprint;
  try {
    const document = await loadingTask.promise;
    assert.equal(document.numPages, 15);
    fingerprint = document.fingerprints?.[1] || document.fingerprints?.[0];
  } finally {
    await loadingTask.destroy();
  }
  assert.equal(raw.pdfFingerprint, fingerprint);
  const {config, warnings} = normalizeBookConfig(raw, 15, fingerprint);
  assert.deepEqual(warnings, []);
  assert.equal(config.title, 'Three Moments');
  assert.equal(config.branding.logo, '/EXAMPLE_MARK.png');
  assert.equal(normalizeBookConfig(raw, 15, 'a-different-pdf').config, null);
  assert.deepEqual(config.chapters.map((chapter) => chapter.title), ['RISE', 'GATHER', 'SLOW']);
  assert.equal(config.chapters.reduce((count, chapter) => count + chapter.items.length, 0), 9);
  const measured = Array.from({length: 15}, (_, index) => classifyPage(
    index + 1, [1, 2, 15].includes(index + 1) ? 595 : 1191, 794,
  ));
  const effective = applyLayoutOverrides(measured, config.layoutOverrides);
  assert.deepEqual(effective.filter((entry) => entry.displayMode === 'single').map((entry) => entry.pageNumber), [1, 2, 15]);
  assert.deepEqual(effective.filter((entry) => entry.displayMode === 'spread').map((entry) => entry.pageNumber),
    Array.from({length: 12}, (_, index) => index + 3));
  assert.equal(createReadingUnits(effective, 'desktop').length, 15);
  assert.equal(createReadingUnits(effective, 'narrow').length, 27);
});
