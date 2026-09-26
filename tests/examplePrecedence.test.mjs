import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadBookConfig} from '../src/config/loadBookConfig.js';
import {selectPdfUrl} from '../src/config/selectPdfUrl.js';

const reply = (value, status = 200, type = 'application/json') => ({
  ok: status >= 200 && status < 300, status,
  headers: {get: () => type}, json: async () => value,
});

test('user PDF wins, otherwise the example PDF is used', async () => {
  assert.equal(await selectPdfUrl(async () => reply(null, 200, 'application/pdf')), '/book.pdf');
  assert.equal(await selectPdfUrl(async () => reply(null, 404)), '/EXAMPLE_BOOK.pdf');
  assert.equal(await selectPdfUrl(async () => reply(null, 200, 'text/html')), '/EXAMPLE_BOOK.pdf');
});

test('config order is book, compatibility alias, example, then zero-config', async () => {
  const values = {
    '/book.json': {title: 'User'}, '/publication.json': {title: 'Alias'},
    '/EXAMPLE_BOOK.json': {title: 'Example'},
  };
  for (const [present, expected, source] of [
    [['/book.json', '/publication.json', '/EXAMPLE_BOOK.json'], 'User', '/book.json'],
    [['/publication.json', '/EXAMPLE_BOOK.json'], 'Alias', '/publication.json'],
    [['/EXAMPLE_BOOK.json'], 'Example', '/EXAMPLE_BOOK.json'],
    [[], undefined, null],
  ]) {
    const calls = [];
    const result = await loadBookConfig(3, async (url) => {
      calls.push(url);
      return present.includes(url) ? reply(values[url]) : reply(null, 404);
    });
    assert.equal(result.config?.title, expected);
    assert.equal(result.source, source);
    assert.equal(calls.at(-1), source ?? '/EXAMPLE_BOOK.json');
  }
});

test('bundled example metadata never attaches to a different user PDF', async () => {
  const example = JSON.parse(await readFile(new URL('../public/EXAMPLE_BOOK.json', import.meta.url), 'utf8'));
  const result = await loadBookConfig(3, async (url) =>
    url === '/EXAMPLE_BOOK.json' ? reply(example) : reply(null, 404), 'unrelated-document');
  assert.equal(result.config, null);
  assert.deepEqual(result.warnings, []);
  assert.equal(result.source, null);
});
