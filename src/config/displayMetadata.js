export const DEFAULT_READER_TITLE = 'PDF Book Reader';

/** @param {import('./bookSchema.js').BookConfig | null} config */
export function readerTitle(config) {
  return config?.title || DEFAULT_READER_TITLE;
}

/** @param {import('./bookSchema.js').BookConfig | null} config */
export function browserTitle(config) {
  return config?.title ? `${config.title} — ${DEFAULT_READER_TITLE}` : DEFAULT_READER_TITLE;
}
