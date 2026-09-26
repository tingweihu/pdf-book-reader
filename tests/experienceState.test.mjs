import test from 'node:test';
import assert from 'node:assert/strict';
import {appearancePreference, atEndOfBook, chapterPresentation, crossedProgressThreshold,
  nextAppearancePreference, nextFocusMode, resolvedAppearance, setScreen} from '../src/reader/experienceState.js';
import {normalizeBookConfig} from '../src/config/bookSchema.js';

test('home and reader transitions retain the exact logical reading unit', () => {
  const reading = {screen: 'reader', unit: {pdfPage: 8, segment: 'right'}};
  const home = setScreen(reading, 'home');
  assert.deepEqual(home.unit, reading.unit);
  assert.deepEqual(setScreen(home, 'reader'), reading);
});

test('page-based progress thresholds ignore same-page segments and backward steps', () => {
  assert.equal(crossedProgressThreshold(21, 21), null);
  assert.equal(crossedProgressThreshold(28, 21), null);
  assert.equal(crossedProgressThreshold(21, 29), 25);
  assert.equal(crossedProgressThreshold(49, 50), 50);
  assert.equal(crossedProgressThreshold(74, 100), 100);
});

test('focus mode toggles and Escape or home exits it', () => {
  assert.equal(nextFocusMode(false, 'toggle'), true);
  assert.equal(nextFocusMode(true, 'toggle'), false);
  assert.equal(nextFocusMode(true, 'escape'), false);
  assert.equal(nextFocusMode(true, 'home'), false);
});

test('system appearance tracks the OS while explicit light and dark win', () => {
  assert.equal(appearancePreference('invalid'), 'system');
  assert.equal(resolvedAppearance('system', true), 'dark');
  assert.equal(resolvedAppearance('system', false), 'light');
  assert.equal(resolvedAppearance('light', true), 'light');
  assert.equal(resolvedAppearance('dark', false), 'dark');
  assert.equal(nextAppearancePreference('system'), 'light');
  assert.equal(nextAppearancePreference('light'), 'dark');
  assert.equal(nextAppearancePreference('dark'), 'system');
});

test('end of book action appears only at the final reading unit', () => {
  assert.equal(atEndOfBook(0, 0), false);
  assert.equal(atEndOfBook(13, 15), false);
  assert.equal(atEndOfBook(14, 15), true);
  assert.equal(atEndOfBook(26, 27), true);
});

test('chapter color and background are optional and validated', () => {
  const {config, warnings} = normalizeBookConfig({chapters: [
    {id: 'one', title: 'One', startPage: 1, color: '#a35', background: '/EXAMPLE_CHAPTER_01.png'},
    {id: 'two', title: 'Two', startPage: 3, color: 'red', background: 'javascript:evil'},
  ]}, 4);
  assert.deepEqual(chapterPresentation(config.chapters[0]), {
    accent: '#a35', background: '/EXAMPLE_CHAPTER_01.png',
  });
  assert.deepEqual(chapterPresentation(config.chapters[1]), {accent: '#42637C', background: null});
  assert.equal(warnings.length, 2);
});

test('optional publisher, social, legal and project links hide unsafe values', () => {
  const {config, warnings} = normalizeBookConfig({
    publisher: {name: 'Example Press', logo: '/logo.png', website: 'https://example.org'},
    socialLinks: [
      {type: 'instagram', href: 'https://instagram.com/example'},
      {type: 'other', href: 'https://example.org'},
      {type: 'x', href: 'javascript:bad'},
    ],
    legal: {privacy: '/privacy', terms: 'file:///terms'},
    project: {repositoryUrl: 'https://github.com/example/reader'},
  }, 4);
  assert.deepEqual(config.publisher, {name: 'Example Press', logo: '/logo.png', website: 'https://example.org'});
  assert.deepEqual(config.socialLinks, [{type: 'instagram', href: 'https://instagram.com/example'}]);
  assert.deepEqual(config.legal, {privacy: '/privacy'});
  assert.deepEqual(config.project, {repositoryUrl: 'https://github.com/example/reader'});
  assert.equal(warnings.length, 3);
  const empty = normalizeBookConfig({}, 4).config;
  assert.equal(empty.publisher, undefined);
  assert.deepEqual(empty.socialLinks, []);
  assert.equal(empty.legal, undefined);
  assert.equal(empty.project, undefined);
});

test('configured favicon is safe and optional', () => {
  const valid = normalizeBookConfig({branding: {favicon: '/mark.png'}}, 2);
  assert.equal(valid.config.branding.favicon, '/mark.png');
  const unsafe = normalizeBookConfig({branding: {favicon: 'javascript:alert(1)'}}, 2);
  assert.equal(unsafe.config.branding, undefined);
  assert.match(unsafe.warnings[0], /branding.favicon/);
});
