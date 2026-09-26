import test from 'node:test';
import assert from 'node:assert/strict';
import {loadBookConfig} from '../src/config/loadBookConfig.js';
import {normalizeBookConfig, safeColor, safeUrl} from '../src/config/bookSchema.js';

const reply = (value, status = 200) => ({ok: status >= 200 && status < 300, status, json: async () => value});

test('canonical book.json wins over publication.json', async () => {
  const calls = [];
  const result = await loadBookConfig(15, async (url) => {
    calls.push(url);
    return reply({title: url === '/book.json' ? 'Canonical' : 'Alias'});
  });
  assert.equal(result.config.title, 'Canonical');
  assert.deepEqual(calls, ['/book.json']);
});

test('publication.json is read only when canonical config is missing', async () => {
  const calls = [];
  const result = await loadBookConfig(15, async (url) => {
    calls.push(url);
    return url === '/book.json' ? reply(null, 404) : reply({title: 'Alias'});
  });
  assert.equal(result.config.title, 'Alias');
  assert.deepEqual(calls, ['/book.json', '/publication.json']);
});

test('two missing config files produce quiet zero-config mode', async () => {
  const result = await loadBookConfig(15, async () => reply(null, 404));
  assert.equal(result.config, null);
  assert.deepEqual(result.warnings, []);
  assert.equal(result.source, null);
});

test('malformed canonical config warns without falling back', async () => {
  const calls = [];
  const result = await loadBookConfig(15, async (url) => {
    calls.push(url);
    return {ok: true, status: 200, json: async () => { throw new SyntaxError('bad JSON'); }};
  });
  assert.equal(result.config, null);
  assert.match(result.warnings[0], /parse \/book.json/);
  assert.deepEqual(calls, ['/book.json']);
});

test('invalid root schema returns explicit validation warning', () => {
  const result = normalizeBookConfig(['not a book'], 15);
  assert.equal(result.config, null);
  assert.match(result.warnings[0], /must be an object/);
});

test('title and subtitle are trimmed and optional sections can be missing', () => {
  const result = normalizeBookConfig({title: '  A Book  ', subtitle: '  Sub  '}, 15);
  assert.equal(result.config.title, 'A Book');
  assert.equal(result.config.subtitle, 'Sub');
  assert.deepEqual(result.config.chapters, []);
  assert.deepEqual(result.config.layoutOverrides, []);
  assert.deepEqual(result.warnings, []);
});

test('invalid chapter and item targets are omitted with warnings, never clamped', () => {
  const result = normalizeBookConfig({chapters: [
    {id: 'bad', title: 'Bad', startPage: 99},
    {id: 'good', title: 'Good', startPage: 3, items: [
      {title: 'Invalid', page: 99},
      {title: 'Range', startPage: 4, endPage: 5},
      {title: 'Backwards', startPage: 7, endPage: 6},
    ]},
  ]}, 15);
  assert.deepEqual(result.config.chapters.map((chapter) => chapter.id), ['good']);
  assert.deepEqual(result.config.chapters[0].items.map((item) => item.title), ['Range']);
  assert.equal(result.warnings.length, 3);
});

test('duplicate chapter ids and invalid theme colors are rejected', () => {
  const result = normalizeBookConfig({theme: {background: 'url(javascript:evil)', accent: '#abc'}, chapters: [
    {id: 'same', title: 'One', startPage: 2},
    {id: 'same', title: 'Two', startPage: 5},
  ]}, 15);
  assert.deepEqual(result.config.theme, {accent: '#abc'});
  assert.equal(result.config.chapters.length, 1);
  assert.equal(result.warnings.length, 2);
});

test('unsafe links and malformed layout ranges are omitted explicitly', () => {
  const result = normalizeBookConfig({
    downloads: [{label: 'Unsafe', href: 'javascript:alert(1)'}, {label: 'PDF', href: '/book.pdf'}],
    layoutOverrides: [{page: 40, mode: 'spread'}, {page: 4, mode: 'side-by-side'}, {page: 5, mode: 'single'}],
  }, 15);
  assert.deepEqual(result.config.downloads, [{label: 'PDF', href: '/book.pdf'}]);
  assert.deepEqual(result.config.layoutOverrides, [{startPage: 5, endPage: 5, mode: 'single'}]);
  assert.equal(result.warnings.length, 3);
  assert.equal(safeUrl('https://example.com/file.pdf'), 'https://example.com/file.pdf');
  assert.equal(safeUrl('//example.com/file.pdf'), null);
  assert.equal(safeUrl('https://user:secret@example.com/file.pdf'), null);
  assert.equal(safeColor('red'), null);
});
