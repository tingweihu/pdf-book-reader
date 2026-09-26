import assert from 'node:assert/strict';
import test from 'node:test';
import {progressPercent} from '../src/reader/progress.js';
import {mapReadingUnit} from '../src/reader/readingUnits.js';
import {inspectPdfFile} from '../scripts/inspect-pdf.mjs';

const pages = await inspectPdfFile(new URL('../public/EXAMPLE_BOOK.pdf', import.meta.url));

test('first PDF page is 0% and final PDF page is 100%', () => {
  assert.equal(progressPercent(1, 15), 0);
  assert.equal(progressPercent(15, 15), 100);
  assert.equal(progressPercent(6, 15), 36);
});

test('a one-page PDF has a safe, complete position', () => {
  assert.equal(progressPercent(1, 1), 100);
  assert.equal(progressPercent(1, 0), 0);
});

test('full, left, and right on the same PDF page have identical progress', () => {
  const units = [
    {pdfPage: 6, segment: 'full'},
    mapReadingUnit({pdfPage: 6, segment: 'full'}, pages, 'narrow'),
    mapReadingUnit({pdfPage: 6, segment: 'right'}, pages, 'narrow'),
  ];
  assert.deepEqual(units.map((unit) => progressPercent(unit.pdfPage, pages.length)), [36, 36, 36]);
});

test('responsive mapping does not change page-based percentage', () => {
  const desktop = mapReadingUnit({pdfPage: 6, segment: 'right'}, pages, 'desktop');
  const narrow = mapReadingUnit(desktop, pages, 'narrow');
  assert.equal(progressPercent(desktop.pdfPage, pages.length), progressPercent(narrow.pdfPage, pages.length));
});
