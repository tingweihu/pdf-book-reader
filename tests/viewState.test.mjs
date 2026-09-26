import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  clampZoom,
  fitDimensions,
  fitViewState,
  panLimits,
  panViewState,
  viewAfterLocationChange,
  zoomViewState,
} from '../src/reader/viewState.js';

const bounds = {width: 500, height: 700};
const fitted = {width: 500, height: 650};

test('zoom clamps to fit minimum, maximum, and finite values', () => {
  assert.equal(clampZoom(0.1), MIN_ZOOM);
  assert.equal(clampZoom(100), MAX_ZOOM);
  assert.equal(clampZoom(NaN), MIN_ZOOM);
  assert.equal(clampZoom(Infinity), MIN_ZOOM);
  assert.equal(zoomViewState(fitViewState(), 0.5, fitted, bounds).zoom, MIN_ZOOM);
  assert.equal(zoomViewState(fitViewState(), 100, fitted, bounds).zoom, MAX_ZOOM);
});

test('fit reset returns centered baseline', () => {
  const zoomed = zoomViewState(fitViewState(), 2, fitted, bounds);
  const panned = panViewState(zoomed, 100, -80, fitted, bounds);
  assert.deepEqual(fitViewState(), {zoom: 1, panX: 0, panY: 0});
  assert.notDeepEqual(panned, fitViewState());
});

test('fit size uses the selected segment rather than the whole spread', () => {
  const page = {width: 1191, height: 794};
  const full = fitDimensions(page, 'full', bounds);
  const left = fitDimensions(page, 'left', bounds);
  const right = fitDimensions(page, 'right', bounds);
  assert.ok(left.scale > full.scale);
  assert.deepEqual(left, right);
  assert.equal(left.width, bounds.width);
  assert.ok(left.height <= bounds.height);
});

test('moving to another PDF page or segment resets zoom and pan', () => {
  const view = {zoom: 2, panX: 80, panY: -30};
  assert.deepEqual(
    viewAfterLocationChange({pdfPage: 3, segment: 'left'}, {pdfPage: 3, segment: 'right'}, 'narrow', 'narrow', view),
    fitViewState(),
  );
  assert.deepEqual(
    viewAfterLocationChange({pdfPage: 3, segment: 'right'}, {pdfPage: 4, segment: 'left'}, 'narrow', 'narrow', view),
    fitViewState(),
  );
  assert.equal(
    viewAfterLocationChange({pdfPage: 3, segment: 'left'}, {pdfPage: 3, segment: 'left'}, 'narrow', 'narrow', view),
    view,
  );
});

test('viewport mode transition resets view while preserving location logic', () => {
  const view = {zoom: 2.5, panX: 70, panY: 15};
  assert.deepEqual(
    viewAfterLocationChange({pdfPage: 6, segment: 'full'}, {pdfPage: 6, segment: 'left'}, 'desktop', 'narrow', view),
    fitViewState(),
  );
  assert.deepEqual(
    viewAfterLocationChange({pdfPage: 6, segment: 'right'}, {pdfPage: 6, segment: 'full'}, 'narrow', 'desktop', view),
    fitViewState(),
  );
});

test('pan is centered at fit and bounded while zoomed', () => {
  assert.deepEqual(panLimits(fitted, bounds, 1), {x: 0, y: 0});
  assert.deepEqual(panViewState(fitViewState(), 10_000, -10_000, fitted, bounds), fitViewState());
  const zoomed = zoomViewState(fitViewState(), 2, fitted, bounds);
  const limits = panLimits(fitted, bounds, zoomed.zoom);
  const farPositive = panViewState(zoomed, 10_000, 10_000, fitted, bounds);
  const farNegative = panViewState(zoomed, -10_000, -10_000, fitted, bounds);
  assert.deepEqual(farPositive, {zoom: 2, panX: limits.x, panY: limits.y});
  assert.deepEqual(farNegative, {zoom: 2, panX: -limits.x, panY: -limits.y});
  assert.ok(fitted.width * 2 / 2 - farPositive.panX >= bounds.width / 2);
  assert.ok(fitted.height * 2 / 2 - farPositive.panY >= bounds.height / 2);
});
