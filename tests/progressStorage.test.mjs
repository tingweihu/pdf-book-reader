import assert from 'node:assert/strict';
import test from 'node:test';
import {inspectPdfFile} from '../scripts/inspect-pdf.mjs';
import {
  LocalStorageProgressStorage,
  storedStateForUnit,
} from '../src/reader/progressStorage.js';
import {restoreReadingUnit} from '../src/reader/progress.js';

const pages = await inspectPdfFile(new URL('../public/EXAMPLE_BOOK.pdf', import.meta.url));
const bookId = 'pdf-book-reader:v1:test-fingerprint';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    values,
  };
}

test('localStorage adapter saves and loads the versioned logical position', async () => {
  const memory = memoryStorage();
  const adapter = new LocalStorageProgressStorage(() => memory);
  const state = storedStateForUnit({pdfPage: 6, segment: 'right'}, 1234);
  await adapter.save(bookId, state);
  assert.deepEqual(await adapter.load(bookId), state);
  assert.equal(memory.values.size, 1);
  assert.deepEqual(JSON.parse(memory.values.get(bookId)), state);
});

test('localStorage adapter clears a saved position', async () => {
  const memory = memoryStorage();
  const store = new LocalStorageProgressStorage(() => memory);
  await store.save(bookId, storedStateForUnit({pdfPage: 3, segment: 'left'}, 1));
  await store.clear(bookId);
  assert.equal(await store.load(bookId), null);
});

test('malformed JSON and unsupported versions are ignored', async () => {
  const memory = memoryStorage();
  const adapter = new LocalStorageProgressStorage(() => memory);
  memory.setItem(bookId, '{not json');
  assert.equal(await adapter.load(bookId), null);
  memory.setItem(bookId, JSON.stringify({version: 2, pdfPage: 6, segment: 'right', updatedAt: 1}));
  assert.equal(await adapter.load(bookId), null);
  memory.setItem(bookId, JSON.stringify({version: 1, pdfPage: 'six', segment: 'right', updatedAt: 1}));
  assert.equal(await adapter.load(bookId), null);
});

test('blocked localStorage reads and writes never reject', async () => {
  const state = storedStateForUnit({pdfPage: 6, segment: 'right'}, 1);
  const blocked = new LocalStorageProgressStorage(() => {
    throw new Error('storage blocked');
  });
  assert.equal(await blocked.load(bookId), null);
  await blocked.save(bookId, state);
  await blocked.clear(bookId);

  const broken = new LocalStorageProgressStorage(() => ({
    getItem: () => { throw new Error('read denied'); },
    setItem: () => { throw new Error('write denied'); },
    removeItem: () => { throw new Error('remove denied'); },
  }));
  assert.equal(await broken.load(bookId), null);
  await broken.save(bookId, state);
  await broken.clear(bookId);
});

test('out-of-range stored PDF page is clamped to the loaded document', () => {
  assert.deepEqual(
    restoreReadingUnit(storedStateForUnit({pdfPage: 999, segment: 'right'}, 1), pages, 'desktop'),
    {pdfPage: 15, segment: 'full'},
  );
  assert.deepEqual(
    restoreReadingUnit(storedStateForUnit({pdfPage: -3, segment: 'full'}, 1), pages, 'narrow'),
    {pdfPage: 1, segment: 'full'},
  );
});

test('stored right segment restores as right on narrow and full on desktop', () => {
  const saved = storedStateForUnit({pdfPage: 6, segment: 'right'}, 1);
  assert.deepEqual(restoreReadingUnit(saved, pages, 'narrow'), {pdfPage: 6, segment: 'right'});
  assert.deepEqual(restoreReadingUnit(saved, pages, 'desktop'), {pdfPage: 6, segment: 'full'});
});

test('stored full spread maps to left on narrow and portrait always maps to full', () => {
  assert.deepEqual(
    restoreReadingUnit(storedStateForUnit({pdfPage: 6, segment: 'full'}, 1), pages, 'narrow'),
    {pdfPage: 6, segment: 'left'},
  );
  assert.deepEqual(
    restoreReadingUnit(storedStateForUnit({pdfPage: 15, segment: 'right'}, 1), pages, 'narrow'),
    {pdfPage: 15, segment: 'full'},
  );
});
