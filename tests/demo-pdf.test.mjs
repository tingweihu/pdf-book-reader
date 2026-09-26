import assert from 'node:assert/strict';
import test from 'node:test';
import {inspectPdfFile} from '../scripts/inspect-pdf.mjs';

test('the 15-page demo has three portrait singles and twelve independent spreads', async () => {
  const pages = await inspectPdfFile(new URL('../public/EXAMPLE_BOOK.pdf', import.meta.url));
  assert.equal(pages.length, 15);

  for (const page of pages) {
    const isPortrait = [1, 2, 15].includes(page.pageNumber);
    assert.equal(page.width, isPortrait ? 595 : 1191);
    assert.equal(page.height, 794);
    assert.equal(page.orientation, isPortrait ? 'portrait' : 'landscape');
    assert.equal(page.displayMode, isPortrait ? 'single' : 'spread');
  }

  assert.deepEqual(
    pages.filter((page) => page.displayMode === 'single').map((page) => page.pageNumber),
    [1, 2, 15],
  );
});
