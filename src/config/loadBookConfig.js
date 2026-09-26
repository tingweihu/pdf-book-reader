import {normalizeBookConfig} from './bookSchema.js';

/** @typedef {import('./bookSchema.js').BookConfig} BookConfig */
/** @typedef {{config: BookConfig | null, warnings: string[], source: string | null}} LoadedBookConfig */

/**
 * A missing optional file is normal. A present but malformed canonical file
 * stops fallback so an old alias cannot silently mask an authoring error.
 * @param {number} pageCount
 * @param {typeof fetch} [fetcher]
 * @param {string | null} [pdfFingerprint]
 * @returns {Promise<LoadedBookConfig>}
 */
export async function loadBookConfig(pageCount, fetcher = fetch, pdfFingerprint = null) {
  for (const path of ['/book.json', '/publication.json', '/EXAMPLE_BOOK.json']) {
    let response;
    try {
      response = await fetcher(path, {headers: {Accept: 'application/json'}});
    } catch (error) {
      return {config: null, source: path, warnings: ['Could not load ' + path + ': ' + String(error)]};
    }
    if (response.status === 404 || response.status === 410) continue;
    // Some static SPA hosts return index.html for an absent optional JSON file.
    if (response.headers?.get('content-type')?.includes('text/html')) continue;
    if (!response.ok) {
      return {config: null, source: path, warnings: [path + ' returned HTTP ' + response.status + '.']};
    }
    try {
      const value = /** @type {unknown} */ (await response.json());
      const result = normalizeBookConfig(value, pageCount, pdfFingerprint);
      // Example metadata belongs only to its bundled PDF. A different user PDF
      // remains an ordinary zero-config book without a distracting warning.
      if (path === '/EXAMPLE_BOOK.json' && result.config === null &&
          result.warnings.some((warning) => warning.includes('different PDF'))) {
        return {config: null, source: null, warnings: []};
      }
      return {...result, source: path};
    } catch (error) {
      return {config: null, source: path, warnings: ['Could not parse ' + path + ': ' + String(error)]};
    }
  }
  return {config: null, source: null, warnings: []};
}
