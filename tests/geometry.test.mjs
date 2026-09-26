import assert from 'node:assert/strict';
import test from 'node:test';
import {classifyPage, MIN_SPREAD_ASPECT_RATIO} from '../src/reader/geometry.js';

test('portrait and square pages are single-page views', () => {
  assert.deepEqual(
    {orientation: classifyPage(1, 595, 794).orientation, mode: classifyPage(1, 595, 794).displayMode},
    {orientation: 'portrait', mode: 'single'},
  );
  assert.equal(classifyPage(2, 600, 600).displayMode, 'single');
});

test('only wide landscape pages are spread candidates', () => {
  assert.equal(classifyPage(3, 1191, 794).displayMode, 'spread');
  assert.equal(classifyPage(4, 1000, 900).displayMode, 'single');
  assert.equal(classifyPage(5, 1250, 1000).aspectRatio, MIN_SPREAD_ASPECT_RATIO);
  assert.equal(classifyPage(5, 1250, 1000).displayMode, 'spread');
});

test('an explicit future mode override can win over the heuristic', () => {
  assert.equal(classifyPage(6, 1191, 794, 'single').displayMode, 'single');
  assert.equal(classifyPage(7, 595, 794, 'spread').displayMode, 'spread');
});

test('invalid page geometry is rejected', () => {
  assert.throws(() => classifyPage(0, 595, 794), RangeError);
  assert.throws(() => classifyPage(1, 0, 794), RangeError);
  assert.throws(() => classifyPage(1, 595, Number.NaN), RangeError);
  assert.throws(() => classifyPage(1, 595, 794, 'foldout'), RangeError);
});
