/** @typedef {'home' | 'reader'} Screen */
/** @typedef {{pdfPage: number, segment: 'full' | 'left' | 'right'}} ReadingUnit */
/** @typedef {{screen: Screen, unit: ReadingUnit}} ExperienceLocation */
/** @typedef {'system' | 'light' | 'dark'} AppearancePreference */

/** @param {ExperienceLocation} location @param {Screen} screen @returns {ExperienceLocation} */
export function setScreen(location, screen) {
  return {...location, screen};
}

/** @param {boolean} focused @param {'toggle' | 'escape' | 'home'} action */
export function nextFocusMode(focused, action) {
  return action === 'toggle' ? !focused : false;
}

/** @param {unknown} value @returns {AppearancePreference} */
export function appearancePreference(value) {
  return value === 'light' || value === 'dark' ? value : 'system';
}

/** @param {AppearancePreference} preference @param {boolean} systemDark */
export function resolvedAppearance(preference, systemDark) {
  return preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;
}

/** @param {AppearancePreference} preference @returns {AppearancePreference} */
export function nextAppearancePreference(preference) {
  return preference === 'system' ? 'light' : preference === 'light' ? 'dark' : 'system';
}

/** @param {number} currentIndex @param {number} unitCount */
export function atEndOfBook(currentIndex, unitCount) {
  return unitCount > 0 && currentIndex === unitCount - 1;
}

const THRESHOLDS = [25, 50, 75, 100];
/** The highest newly crossed page-based milestone; no repeats for segments or reload. */
/** @param {number} previous @param {number} next */
export function crossedProgressThreshold(previous, next) {
  if (!Number.isFinite(previous) || !Number.isFinite(next) || next <= previous) return null;
  return THRESHOLDS.filter((threshold) => previous < threshold && next >= threshold).at(-1) ?? null;
}

/** @param {{color?: string, background?: string} | null} chapter */
export function chapterPresentation(chapter) {
  return {accent: chapter?.color ?? '#42637C', background: chapter?.background ?? null};
}
