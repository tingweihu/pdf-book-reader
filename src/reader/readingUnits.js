/** @typedef {import('./geometry.js').PageGeometry} PageGeometry */
/** @typedef {'full' | 'left' | 'right'} ReadingSegment */
/** @typedef {'desktop' | 'narrow'} ViewportMode */
/** @typedef {{pdfPage: number, segment: ReadingSegment}} ReadingUnit */

export const NARROW_VIEWPORT_WIDTH = 768;

/** @param {number} width @returns {ViewportMode} */
export function modeForViewport(width) {
  if (!Number.isFinite(width) || width < 0) {
    throw new RangeError('Viewport width must be a non-negative finite number');
  }
  return width < NARROW_VIEWPORT_WIDTH ? 'narrow' : 'desktop';
}

/**
 * One PDF page is one desktop unit. A composed spread creates two units only
 * in the narrow viewport; no unit ever combines separate PDF pages.
 * PageGeometry.displayMode is the seam for a future explicit mode override.
 *
 * @param {PageGeometry[]} pages
 * @param {ViewportMode} mode
 * @returns {ReadingUnit[]}
 */
export function createReadingUnits(pages, mode) {
  assertMode(mode);
  /** @type {ReadingUnit[]} */
  const units = [];
  pages.forEach((page, index) => {
    if (page.pageNumber !== index + 1) {
      throw new RangeError('Page geometry must be ordered by PDF page number');
    }
    if (mode === 'narrow' && page.displayMode === 'spread') {
      units.push({pdfPage: page.pageNumber, segment: 'left'});
      units.push({pdfPage: page.pageNumber, segment: 'right'});
    } else {
      units.push({pdfPage: page.pageNumber, segment: 'full'});
    }
  });
  return units;
}

/**
 * Preserve the document page across viewport changes. A full composed spread
 * starts at its left segment on narrow screens; a known right segment stays
 * right while the reader remains narrow.
 *
 * @param {ReadingUnit} unit
 * @param {PageGeometry[]} pages
 * @param {ViewportMode} mode
 * @returns {ReadingUnit}
 */
export function mapReadingUnit(unit, pages, mode) {
  assertMode(mode);
  const page = pages[unit.pdfPage - 1];
  if (!page || page.pageNumber !== unit.pdfPage) {
    throw new RangeError('ReadingUnit PDF page is outside the document');
  }
  if (mode === 'desktop' || page.displayMode === 'single') {
    return {pdfPage: unit.pdfPage, segment: 'full'};
  }
  return {pdfPage: unit.pdfPage, segment: unit.segment === 'right' ? 'right' : 'left'};
}

/**
 * @param {ReadingUnit} unit
 * @param {PageGeometry[]} pages
 * @param {ViewportMode} mode
 * @param {-1 | 1} direction
 * @returns {ReadingUnit}
 */
export function stepReadingUnit(unit, pages, mode, direction) {
  if (direction !== -1 && direction !== 1) {
    throw new RangeError('Direction must be -1 or 1');
  }
  const sequence = createReadingUnits(pages, mode);
  const current = mapReadingUnit(unit, pages, mode);
  const index = sequence.findIndex(
    (candidate) => candidate.pdfPage === current.pdfPage && candidate.segment === current.segment,
  );
  if (index < 0) throw new Error('ReadingUnit is missing from the sequence');
  return sequence[Math.max(0, Math.min(index + direction, sequence.length - 1))];
}

/** @param {ViewportMode} mode */
function assertMode(mode) {
  if (mode !== 'desktop' && mode !== 'narrow') {
    throw new RangeError('Viewport mode must be desktop or narrow');
  }
}
