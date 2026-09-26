import assert from 'node:assert/strict';
import test from 'node:test';
import {inspectPdfFile} from '../scripts/inspect-pdf.mjs';
import {
  isThumbnailSelected,
  thumbnailTargets,
  unitForThumbnail,
} from '../src/reader/thumbnails.js';

const pages = await inspectPdfFile(new URL('../public/EXAMPLE_BOOK.pdf', import.meta.url));

test('the demo has one thumbnail target per actual PDF page', () => {
  assert.deepEqual(thumbnailTargets(pages), Array.from({length: 15}, (_, index) => index + 1));
});

test('thumbnail jump chooses full on desktop and left for a narrow spread', () => {
  assert.deepEqual(unitForThumbnail(6, pages, 'desktop'), {pdfPage: 6, segment: 'full'});
  assert.deepEqual(unitForThumbnail(6, pages, 'narrow'), {pdfPage: 6, segment: 'left'});
  assert.deepEqual(unitForThumbnail(15, pages, 'narrow'), {pdfPage: 15, segment: 'full'});
});

test('left and right segments select the same page thumbnail', () => {
  assert.equal(isThumbnailSelected({pdfPage: 6, segment: 'left'}, 6), true);
  assert.equal(isThumbnailSelected({pdfPage: 6, segment: 'right'}, 6), true);
  assert.equal(isThumbnailSelected({pdfPage: 6, segment: 'right'}, 7), false);
});
