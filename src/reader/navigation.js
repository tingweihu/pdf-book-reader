/**
 * @param {number} requestedPage
 * @param {number} pageCount
 * @returns {number}
 */
export function clampPage(requestedPage, pageCount) {
  if (!Number.isInteger(pageCount) || pageCount < 1) {
    throw new RangeError('Page count must be a positive integer');
  }
  const page = Number.isFinite(requestedPage) ? Math.trunc(requestedPage) : 1;
  return Math.min(pageCount, Math.max(1, page));
}
