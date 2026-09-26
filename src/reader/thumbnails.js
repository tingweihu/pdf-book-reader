import {clampPage} from './navigation.js';
import {mapReadingUnit} from './readingUnits.js';

/** @typedef {import('./geometry.js').PageGeometry} PageGeometry */
/** @typedef {import('./readingUnits.js').ReadingUnit} ReadingUnit */
/** @typedef {import('./readingUnits.js').ViewportMode} ViewportMode */

/** @param {PageGeometry[]} pages */
export function thumbnailTargets(pages) {
  return pages.map((page) => page.pageNumber);
}

/**
 * An intentional thumbnail jump always starts at the first visible segment
 * of that PDF page, irrespective of the previously selected segment.
 * @param {number} targetPage
 * @param {PageGeometry[]} pages
 * @param {ViewportMode} mode
 * @returns {ReadingUnit}
 */
export function unitForThumbnail(targetPage, pages, mode) {
  const pdfPage = clampPage(targetPage, pages.length);
  return mapReadingUnit({pdfPage, segment: 'full'}, pages, mode);
}

/** @param {ReadingUnit} current @param {number} thumbnailPage */
export function isThumbnailSelected(current, thumbnailPage) {
  return current.pdfPage === thumbnailPage;
}
