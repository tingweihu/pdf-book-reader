import assert from 'node:assert/strict';
import test from 'node:test';
import {clampPage} from '../src/reader/navigation.js';

test('page-number clamping keeps navigation within the loaded PDF', () => {
  assert.equal(clampPage(-20, 15), 1);
  assert.equal(clampPage(0, 15), 1);
  assert.equal(clampPage(1, 15), 1);
  assert.equal(clampPage(8, 15), 8);
  assert.equal(clampPage(16, 15), 15);
  assert.equal(clampPage(Number.NaN, 15), 1);
});

test('a missing page count cannot be used for navigation', () => {
  assert.throws(() => clampPage(1, 0), RangeError);
  assert.throws(() => clampPage(1, 1.5), RangeError);
});
