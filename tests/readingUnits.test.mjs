import assert from 'node:assert/strict';
import test from 'node:test';
import {inspectPdfFile} from '../scripts/inspect-pdf.mjs';
import {
  createReadingUnits,
  mapReadingUnit,
  modeForViewport,
  stepReadingUnit,
} from '../src/reader/readingUnits.js';

const pages = await inspectPdfFile(new URL('../public/EXAMPLE_BOOK.pdf', import.meta.url));
const unit = (pdfPage, segment) => ({pdfPage, segment});

test('desktop demo sequence has exactly one complete unit per PDF page', () => {
  const sequence = createReadingUnits(pages, 'desktop');
  assert.equal(sequence.length, 15);
  assert.deepEqual(sequence, pages.map((page) => unit(page.pageNumber, 'full')));
});

test('narrow demo sequence has 27 ordered units without duplicates', () => {
  const sequence = createReadingUnits(pages, 'narrow');
  assert.equal(sequence.length, 27);
  assert.deepEqual(sequence.slice(0, 2), [unit(1, 'full'), unit(2, 'full')]);
  assert.deepEqual(sequence.at(-1), unit(15, 'full'));
  for (let pdfPage = 3; pdfPage <= 14; pdfPage += 1) {
    assert.deepEqual(
      sequence.filter((candidate) => candidate.pdfPage === pdfPage),
      [unit(pdfPage, 'left'), unit(pdfPage, 'right')],
    );
  }
  assert.equal(new Set(sequence.map((candidate) => candidate.pdfPage + ':' + candidate.segment)).size, 27);
});

test('forward navigation crosses composed spread boundaries in order', () => {
  let current = unit(2, 'full');
  for (const expected of [unit(3, 'left'), unit(3, 'right'), unit(4, 'left'), unit(4, 'right')]) {
    current = stepReadingUnit(current, pages, 'narrow', 1);
    assert.deepEqual(current, expected);
  }
  assert.deepEqual(stepReadingUnit(unit(14, 'right'), pages, 'narrow', 1), unit(15, 'full'));
});

test('reverse navigation crosses composed spread boundaries in order', () => {
  let current = unit(4, 'left');
  for (const expected of [unit(3, 'right'), unit(3, 'left'), unit(2, 'full')]) {
    current = stepReadingUnit(current, pages, 'narrow', -1);
    assert.deepEqual(current, expected);
  }
});

test('first and final reading units clamp', () => {
  for (const mode of ['desktop', 'narrow']) {
    const sequence = createReadingUnits(pages, mode);
    assert.deepEqual(stepReadingUnit(sequence[0], pages, mode, -1), sequence[0]);
    assert.deepEqual(stepReadingUnit(sequence.at(-1), pages, mode, 1), sequence.at(-1));
  }
});

test('responsive mapping preserves PDF page and handles segments deterministically', () => {
  assert.deepEqual(mapReadingUnit(unit(6, 'full'), pages, 'narrow'), unit(6, 'left'));
  assert.deepEqual(mapReadingUnit(unit(6, 'right'), pages, 'desktop'), unit(6, 'full'));
  assert.deepEqual(mapReadingUnit(unit(6, 'right'), pages, 'narrow'), unit(6, 'right'));
  for (const pdfPage of [1, 2, 15]) {
    assert.deepEqual(mapReadingUnit(unit(pdfPage, 'full'), pages, 'narrow'), unit(pdfPage, 'full'));
  }
});

test('reader width selects viewport mode at a fixed boundary', () => {
  assert.equal(modeForViewport(390), 'narrow');
  assert.equal(modeForViewport(767), 'narrow');
  assert.equal(modeForViewport(768), 'desktop');
  assert.equal(modeForViewport(1200), 'desktop');
});
