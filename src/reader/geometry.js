export const MIN_SPREAD_ASPECT_RATIO = 1.25;

/** @typedef {'portrait' | 'landscape' | 'square'} Orientation */
/** @typedef {'single' | 'spread'} DisplayMode */
/**
 * @typedef {object} PageGeometry
 * @property {number} pageNumber
 * @property {number} width
 * @property {number} height
 * @property {Orientation} orientation
 * @property {DisplayMode} displayMode
 * @property {number} aspectRatio
 */

/**
 * Classify one PDF page. A later configuration layer can pass a mode override.
 * This is a heuristic for wide pages, not proof of an editorial spread.
 *
 * @param {number} pageNumber
 * @param {number} width
 * @param {number} height
 * @param {DisplayMode} [modeOverride]
 * @returns {PageGeometry}
 */
export function classifyPage(pageNumber, width, height, modeOverride) {
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    throw new RangeError('Page number must be a positive integer');
  }
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new RangeError('Page dimensions must be positive finite numbers');
  }
  if (modeOverride !== undefined && modeOverride !== 'single' && modeOverride !== 'spread') {
    throw new RangeError('Display mode override must be single or spread');
  }

  const orientation = width > height ? 'landscape' : width < height ? 'portrait' : 'square';
  const aspectRatio = width / height;
  const displayMode = modeOverride ?? (orientation === 'landscape' && aspectRatio >= MIN_SPREAD_ASPECT_RATIO ? 'spread' : 'single');

  return {pageNumber, width, height, orientation, displayMode, aspectRatio};
}
