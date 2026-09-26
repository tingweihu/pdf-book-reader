import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyPage} from '../src/reader/geometry.js';
import {createReadingUnits, mapReadingUnit} from '../src/reader/readingUnits.js';
import {progressPercent} from '../src/reader/progress.js';
import {applyLayoutOverrides, currentChapter, currentItem, itemTarget} from '../src/config/bookNavigation.js';

const geometry = Array.from({length: 15}, (_, index) => classifyPage(index + 1,
  [1, 2, 15].includes(index + 1) ? 595 : 1191, 794));

test('heuristic remains when there is no override', () => {
  assert.deepEqual(applyLayoutOverrides(geometry, []).map((page) => page.displayMode), geometry.map((page) => page.displayMode));
});

test('explicit spread and single override geometry only in their ranges', () => {
  const effective = applyLayoutOverrides(geometry, [
    {startPage: 2, endPage: 2, mode: 'spread'},
    {startPage: 8, endPage: 8, mode: 'single'},
  ]);
  assert.equal(effective[1].displayMode, 'spread');
  assert.equal(effective[7].displayMode, 'single');
  assert.equal(effective[6].displayMode, 'spread');
  assert.equal(effective[8].displayMode, 'spread');
  assert.equal(effective[1].orientation, 'portrait');
});

test('desktop stays one unit per PDF page with overrides', () => {
  const effective = applyLayoutOverrides(geometry, [{startPage: 8, endPage: 8, mode: 'single'}]);
  assert.equal(createReadingUnits(effective, 'desktop').length, 15);
  assert.deepEqual(createReadingUnits(effective, 'desktop')[7], {pdfPage: 8, segment: 'full'});
});

test('narrow configured spread splits and configured single stays full', () => {
  const effective = applyLayoutOverrides(geometry, [
    {startPage: 2, endPage: 2, mode: 'spread'},
    {startPage: 8, endPage: 8, mode: 'single'},
  ]);
  assert.deepEqual(createReadingUnits(effective, 'narrow').filter((unit) => unit.pdfPage === 2).map((unit) => unit.segment), ['left', 'right']);
  assert.deepEqual(createReadingUnits(effective, 'narrow').filter((unit) => unit.pdfPage === 8).map((unit) => unit.segment), ['full']);
  assert.deepEqual(mapReadingUnit({pdfPage: 8, segment: 'right'}, effective, 'narrow'), {pdfPage: 8, segment: 'full'});
});

const chapters = [
  {id: 'one', title: 'One', startPage: 3, items: [{title: 'Start', page: 4}, {title: 'Range', startPage: 5, endPage: 6}]},
  {id: 'two', title: 'Two', startPage: 7, endPage: 10, items: []},
  {id: 'three', title: 'Three', startPage: 11, items: []},
];

test('current chapter uses PDF page and next start or explicit end', () => {
  assert.equal(currentChapter(chapters, 2, 15), null);
  assert.equal(currentChapter(chapters, 6, 15)?.id, 'one');
  assert.equal(currentChapter(chapters, 7, 15)?.id, 'two');
  assert.equal(currentChapter(chapters, 11, 15)?.id, 'three');
  assert.equal(currentChapter(chapters, 15, 15)?.id, 'three');
});

test('item current state respects exact page and explicit range only', () => {
  assert.equal(currentItem(chapters[0], 4)?.title, 'Start');
  assert.equal(currentItem(chapters[0], 5)?.title, 'Range');
  assert.equal(currentItem(chapters[0], 6)?.title, 'Range');
  assert.equal(currentItem(chapters[0], 3), null);
  assert.equal(itemTarget(chapters[0].items[1]), 5);
});

test('TOC target follows ReadingUnit rules and never changes canonical progress', () => {
  const target = itemTarget(chapters[0].items[1]);
  assert.deepEqual(mapReadingUnit({pdfPage: target, segment: 'right'}, geometry, 'desktop'), {pdfPage: 5, segment: 'full'});
  assert.deepEqual(mapReadingUnit({pdfPage: target, segment: 'full'}, geometry, 'narrow'), {pdfPage: 5, segment: 'left'});
  assert.deepEqual(mapReadingUnit({pdfPage: 2, segment: 'right'}, geometry, 'narrow'), {pdfPage: 2, segment: 'full'});
  assert.equal(progressPercent(5, 15), progressPercent(5, 15));
});
