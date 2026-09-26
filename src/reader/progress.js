import {clampPage} from './navigation.js';
import {mapReadingUnit} from './readingUnits.js';

/** @typedef {import('./geometry.js').PageGeometry} PageGeometry */
/** @typedef {import('./readingUnits.js').ReadingUnit} ReadingUnit */
/** @typedef {import('./readingUnits.js').ViewportMode} ViewportMode */
/** @typedef {import('./progressStorage.js').StoredReaderState} StoredReaderState */

/**
 * Page-based progress stays unchanged when the viewport splits a composed
 * spread into two ReadingUnits. A one-page document is already at its end.
 * @param {number} pdfPage
 * @param {number} pageCount
 */
export function progressPercent(pdfPage, pageCount) {
  if (!Number.isInteger(pageCount) || pageCount < 1) return 0;
  if (pageCount === 1) return 100;
  const page = clampPage(pdfPage, pageCount);
  return Math.round((page - 1) * 100 / (pageCount - 1));
}

/**
 * @param {StoredReaderState | null} saved
 * @param {PageGeometry[]} pages
 * @param {ViewportMode} mode
 * @returns {ReadingUnit}
 */
export function restoreReadingUnit(saved, pages, mode) {
  if (pages.length < 1) throw new RangeError('Cannot restore before PDF geometry is loaded');
  const pdfPage = clampPage(saved?.pdfPage ?? 1, pages.length);
  const segment = saved?.segment ?? 'full';
  return mapReadingUnit({pdfPage, segment}, pages, mode);
}
