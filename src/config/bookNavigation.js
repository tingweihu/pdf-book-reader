/** @typedef {import('./bookSchema.js').BookChapter} BookChapter */
/** @typedef {import('./bookSchema.js').BookItem} BookItem */
/** @typedef {import('./bookSchema.js').LayoutOverride} LayoutOverride */
/** @typedef {import('../reader/geometry.js').PageGeometry} PageGeometry */

/** @param {PageGeometry[]} geometry @param {LayoutOverride[]} overrides @returns {PageGeometry[]} */
export function applyLayoutOverrides(geometry, overrides) {
  return geometry.map((page) => {
    const override = overrides.find((entry) => page.pageNumber >= entry.startPage && page.pageNumber <= entry.endPage);
    return override ? {...page, displayMode: override.mode} : page;
  });
}

/** @param {BookChapter[]} chapters @param {number} pdfPage @param {number} pageCount */
export function currentChapter(chapters, pdfPage, pageCount) {
  return chapters.find((chapter, index) => {
    const end = chapter.endPage ?? ((chapters[index + 1]?.startPage ?? (pageCount + 1)) - 1);
    return pdfPage >= chapter.startPage && pdfPage <= end;
  }) ?? null;
}

/** A start-only item is current on its exact page; no inferred range. */
/** @param {BookChapter | null} chapter @param {number} pdfPage @returns {BookItem | null} */
export function currentItem(chapter, pdfPage) {
  return chapter?.items.find((item) => {
    if (item.page !== undefined) return pdfPage === item.page;
    return item.startPage !== undefined && pdfPage >= item.startPage && pdfPage <= (item.endPage ?? item.startPage);
  }) ?? null;
}

/** @param {BookItem} item */
export function itemTarget(item) {
  return item.page ?? item.startPage;
}
