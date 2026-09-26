/** @typedef {'full' | 'left' | 'right'} ReadingSegment */
/**
 * @typedef {{version: 1, pdfPage: number, segment: ReadingSegment, updatedAt: number}} StoredReaderState
 */
/**
 * @typedef {{
 *   load(bookId: string): Promise<StoredReaderState | null>,
 *   save(bookId: string, state: StoredReaderState): Promise<void>,
 *   clear(bookId: string): Promise<void>
 * }} ProgressStorage
 */
/**
 * @typedef {{
 *   getItem(key: string): string | null,
 *   setItem(key: string, value: string): void,
 *   removeItem(key: string): void
 * }} StorageLike
 */

/** @param {unknown} value @returns {value is StoredReaderState} */
export function isStoredReaderState(value) {
  if (!value || typeof value !== 'object') return false;
  const state = /** @type {Record<string, unknown>} */ (value);
  return state.version === 1 &&
    typeof state.pdfPage === 'number' && Number.isInteger(state.pdfPage) &&
    (state.segment === 'full' || state.segment === 'left' || state.segment === 'right') &&
    typeof state.updatedAt === 'number' && Number.isFinite(state.updatedAt) &&
    state.updatedAt >= 0;
}

/**
 * localStorage access is deliberately lazy: even reading window.localStorage
 * can throw in restricted browser environments.
 * @implements {ProgressStorage}
 */
export class LocalStorageProgressStorage {
  /** @param {() => StorageLike} [storageProvider] */
  constructor(storageProvider = () => globalThis.localStorage) {
    this.storageProvider = storageProvider;
  }

  /** @param {string} bookId @returns {Promise<StoredReaderState | null>} */
  async load(bookId) {
    if (!bookId) return null;
    try {
      const raw = this.storageProvider().getItem(bookId);
      if (raw === null) return null;
      const value = /** @type {unknown} */ (JSON.parse(raw));
      return isStoredReaderState(value) ? value : null;
    } catch {
      return null;
    }
  }

  /** @param {string} bookId @param {StoredReaderState} state */
  async save(bookId, state) {
    if (!bookId || !isStoredReaderState(state)) return;
    try {
      this.storageProvider().setItem(bookId, JSON.stringify(state));
    } catch {
      // Persistence is optional; PDF reading must remain available.
    }
  }

  /** @param {string} bookId */
  async clear(bookId) {
    if (!bookId) return;
    try {
      this.storageProvider().removeItem(bookId);
    } catch {
      // Clearing an unavailable store is also harmless.
    }
  }
}

/**
 * @param {{pdfPage: number, segment: ReadingSegment}} unit
 * @param {number} [updatedAt]
 * @returns {StoredReaderState}
 */
export function storedStateForUnit(unit, updatedAt = Date.now()) {
  return {version: 1, pdfPage: unit.pdfPage, segment: unit.segment, updatedAt};
}
