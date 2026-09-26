/** @typedef {'full' | 'left' | 'right'} ReadingSegment */
/** @typedef {{pdfPage: number, segment: ReadingSegment}} ReadingUnit */
/** @typedef {'desktop' | 'narrow'} ViewportMode */
/** @typedef {{width: number, height: number}} Size */
/** @typedef {{zoom: number, panX: number, panY: number}} ReaderViewState */

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;
export const ZOOM_STEP = 1.25;

/** @returns {ReaderViewState} */
export function fitViewState() {
  return {zoom: MIN_ZOOM, panX: 0, panY: 0};
}

/** @param {number} requested @returns {number} */
export function clampZoom(requested) {
  return Number.isFinite(requested)
    ? Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, requested))
    : MIN_ZOOM;
}

/**
 * CSS dimensions at the fit baseline. A narrow spread fits its selected half,
 * not the complete landscape page.
 * @param {Size} page
 * @param {ReadingSegment} segment
 * @param {Size} bounds
 * @returns {{width: number, height: number, scale: number}}
 */
export function fitDimensions(page, segment, bounds) {
  if (![page.width, page.height, bounds.width, bounds.height].every(
    (value) => Number.isFinite(value) && value > 0,
  )) {
    throw new RangeError('Page and viewport dimensions must be positive finite numbers');
  }
  if (segment !== 'full' && segment !== 'left' && segment !== 'right') {
    throw new RangeError('Unknown reading segment');
  }
  const visiblePageWidth = segment === 'full' ? page.width : page.width / 2;
  const scale = Math.min(bounds.width / visiblePageWidth, bounds.height / page.height);
  return {width: visiblePageWidth * scale, height: page.height * scale, scale};
}

/**
 * Centered content may move only along axes where its zoomed size exceeds the
 * viewport. At either limit its edge meets the viewport edge.
 * @param {Size} fitted
 * @param {Size} bounds
 * @param {number} zoom
 */
export function panLimits(fitted, bounds, zoom) {
  const safeZoom = clampZoom(zoom);
  return {
    x: Math.max(0, (fitted.width * safeZoom - bounds.width) / 2),
    y: Math.max(0, (fitted.height * safeZoom - bounds.height) / 2),
  };
}

/**
 * @param {ReaderViewState} state
 * @param {Size} fitted
 * @param {Size} bounds
 * @returns {ReaderViewState}
 */
export function clampViewState(state, fitted, bounds) {
  const zoom = clampZoom(state.zoom);
  const limits = panLimits(fitted, bounds, zoom);
  const panX = Number.isFinite(state.panX) ? state.panX : 0;
  const panY = Number.isFinite(state.panY) ? state.panY : 0;
  return {
    zoom,
    panX: limits.x === 0 ? 0 : Math.max(-limits.x, Math.min(limits.x, panX)),
    panY: limits.y === 0 ? 0 : Math.max(-limits.y, Math.min(limits.y, panY)),
  };
}

/**
 * @param {ReaderViewState} state
 * @param {number} requestedZoom
 * @param {Size} fitted
 * @param {Size} bounds
 */
export function zoomViewState(state, requestedZoom, fitted, bounds) {
  const zoom = clampZoom(requestedZoom);
  const previousZoom = clampZoom(state.zoom);
  return clampViewState({
    zoom,
    panX: state.panX * zoom / previousZoom,
    panY: state.panY * zoom / previousZoom,
  }, fitted, bounds);
}

/**
 * @param {ReaderViewState} state
 * @param {number} deltaX
 * @param {number} deltaY
 * @param {Size} fitted
 * @param {Size} bounds
 */
export function panViewState(state, deltaX, deltaY, fitted, bounds) {
  return clampViewState({
    zoom: state.zoom,
    panX: state.panX + deltaX,
    panY: state.panY + deltaY,
  }, fitted, bounds);
}

/**
 * @param {ReadingUnit} previousUnit
 * @param {ReadingUnit} nextUnit
 * @param {ViewportMode} previousMode
 * @param {ViewportMode} nextMode
 * @param {ReaderViewState} state
 */
export function viewAfterLocationChange(previousUnit, nextUnit, previousMode, nextMode, state) {
  return previousMode !== nextMode ||
    previousUnit.pdfPage !== nextUnit.pdfPage ||
    previousUnit.segment !== nextUnit.segment
    ? fitViewState()
    : state;
}
