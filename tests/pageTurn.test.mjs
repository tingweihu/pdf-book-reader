import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyPage} from '../src/reader/geometry.js';
import {createReadingUnits, stepReadingUnit} from '../src/reader/readingUnits.js';
import {commitPageTurn, pageTurnFor, pageTurnFallbackDelay, settlePageTurn} from '../src/reader/pageTurn.js';

const pages = Array.from({length: 15}, (_, index) => classifyPage(
  index + 1, [1, 2, 15].includes(index + 1) ? 595 : 1191, 794,
));
const unit = (pdfPage, segment = 'full') => ({pdfPage, segment});

test('portrait/full navigations use a full-surface portrait transition in both directions', () => {
  assert.equal(pageTurnFor(unit(1), unit(2), pages, false, 1).kind, 'portrait');
  const reverse = pageTurnFor(unit(2), unit(1), pages, false, 2);
  assert.equal(reverse.kind, 'portrait');
  assert.equal(reverse.direction, 'backward');
});

test('desktop landscape/full moves one complete PDF surface', () => {
  assert.equal(pageTurnFor(unit(3), unit(4), pages, false, 1).kind, 'spread');
  assert.equal(pageTurnFor(unit(4), unit(3), pages, false, 2).kind, 'spread');
  assert.equal(createReadingUnits(pages, 'desktop').length, 15);
});

test('same-page left to right and reverse are restrained segment turns', () => {
  const forward = pageTurnFor(unit(3, 'left'), unit(3, 'right'), pages, false, 1);
  const reverse = pageTurnFor(unit(3, 'right'), unit(3, 'left'), pages, false, 2);
  assert.equal(forward.kind, 'segment');
  assert.equal(forward.direction, 'forward');
  assert.equal(reverse.kind, 'segment');
  assert.equal(reverse.direction, 'backward');
});

test('right to next left is a stronger page boundary turn', () => {
  assert.equal(pageTurnFor(unit(3, 'right'), unit(4, 'left'), pages, false, 1).kind, 'boundary');
  assert.equal(pageTurnFor(unit(4, 'left'), unit(3, 'right'), pages, false, 2).direction, 'backward');
  assert.equal(createReadingUnits(pages, 'narrow').length, 27);
});

test('reduced motion uses a short fade without movement kind', () => {
  const turn = pageTurnFor(unit(3), unit(4), pages, true, 1);
  assert.equal(turn.kind, 'fade');
  assert.ok(turn.duration <= 100);
});

test('rapid navigation commits every ReadingUnit and replaces presentation', () => {
  let state = {unit: unit(2, 'full'), turn: null, serial: 0};
  for (let index = 0; index < 3; index += 1) {
    state = commitPageTurn(state, stepReadingUnit(state.unit, pages, 'narrow', 1), pages, false);
  }
  assert.deepEqual(state.unit, unit(4, 'left'));
  assert.equal(state.serial, 3);
  assert.deepEqual(state.turn.to, unit(4, 'left'));
  assert.equal(settlePageTurn(state.turn, 1), state.turn);
});

test('animation failure or missing CSS event cannot roll back navigation', () => {
  const state = commitPageTurn({unit: unit(3), turn: null, serial: 0}, unit(4), pages, false);
  assert.deepEqual(state.unit, unit(4));
  assert.ok(pageTurnFallbackDelay(state.turn) > state.turn.duration);
  assert.equal(settlePageTurn(state.turn, state.turn.id), null);
  assert.deepEqual(state.unit, unit(4));
  assert.equal(pageTurnFor(unit(4), unit(4), pages, false, 9), null);
});
