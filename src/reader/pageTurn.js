/** @typedef {import('./readingUnits.js').ReadingUnit} ReadingUnit */
/** @typedef {import('./geometry.js').PageGeometry} PageGeometry */
/** @typedef {'portrait' | 'spread' | 'segment' | 'boundary' | 'fade'} TurnKind */
/** @typedef {{id: number, from: ReadingUnit, to: ReadingUnit, direction: 'forward' | 'backward', kind: TurnKind, duration: number}} PageTurnState */

/** @param {ReadingUnit} a @param {ReadingUnit} b */
export function sameUnit(a, b) {
  return a.pdfPage === b.pdfPage && a.segment === b.segment;
}

/**
 * Presentation follows committed navigation. It never decides the destination.
 * @param {ReadingUnit} from
 * @param {ReadingUnit} to
 * @param {PageGeometry[]} pages
 * @param {boolean} reducedMotion
 * @param {number} id
 * @returns {PageTurnState | null}
 */
export function pageTurnFor(from, to, pages, reducedMotion, id) {
  if (sameUnit(from, to)) return null;
  const source = pages[from.pdfPage - 1];
  const target = pages[to.pdfPage - 1];
  if (!source || !target) return null;
  const direction = to.pdfPage > from.pdfPage ||
    (to.pdfPage === from.pdfPage && from.segment === 'left' && to.segment === 'right')
    ? 'forward' : 'backward';
  /** @type {TurnKind} */
  let kind;
  if (reducedMotion) kind = 'fade';
  else if (from.pdfPage === to.pdfPage) kind = 'segment';
  else if (from.segment !== 'full' || to.segment !== 'full') kind = 'boundary';
  else if (source.orientation === 'portrait' || target.orientation === 'portrait') kind = 'portrait';
  else kind = 'spread';
  const duration = kind === 'fade' ? 90 : kind === 'segment' ? 190 : kind === 'boundary' ? 280 : 250;
  return {id, from, to, direction, kind, duration};
}

/** An obsolete completion or failed animation cannot affect a newer turn. */
/** @param {PageTurnState | null} active @param {number} completedId */
export function settlePageTurn(active, completedId) {
  return active?.id === completedId ? null : active;
}

/** @param {PageTurnState} turn */
export function pageTurnFallbackDelay(turn) {
  return turn.duration + 180;
}

/**
 * Pure rapid-navigation model: each input commits a new ReadingUnit and
 * replaces the optional presentation. A failed animation only clears itself.
 * @param {{unit: ReadingUnit, turn: PageTurnState | null, serial: number}} state
 * @param {ReadingUnit} next
 * @param {PageGeometry[]} pages
 * @param {boolean} reducedMotion
 */
export function commitPageTurn(state, next, pages, reducedMotion) {
  if (sameUnit(state.unit, next)) return state;
  const serial = state.serial + 1;
  return {unit: next, turn: pageTurnFor(state.unit, next, pages, reducedMotion, serial), serial};
}
