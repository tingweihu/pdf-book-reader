/** @typedef {import('../reader/geometry.js').DisplayMode} DisplayMode */
/** @typedef {{id?: string, title: string, subtitle?: string, page?: number, startPage?: number, endPage?: number}} BookItem */
/** @typedef {{id: string, title: string, subtitle?: string, startPage: number, endPage?: number, color?: string, background?: string, items: BookItem[]}} BookChapter */
/** @typedef {{startPage: number, endPage: number, mode: DisplayMode}} LayoutOverride */
/** @typedef {{label: string, href: string}} BookDownload */
/** @typedef {{type: 'website' | 'facebook' | 'instagram' | 'linkedin' | 'x', href: string}} SocialLink */
/** @typedef {{id?: string, pdfFingerprint?: string, title?: string, subtitle?: string, description?: string, language?: string, cover?: {mode: 'pdf-page' | 'image', page?: number, src?: string}, branding?: {logo?: string, alt?: string, favicon?: string}, theme?: {background?: string, surface?: string, text?: string, muted?: string, accent?: string}, publisher?: {name?: string, logo?: string, website?: string}, socialLinks: SocialLink[], legal?: {privacy?: string, terms?: string}, project?: {repositoryUrl?: string}, chapters: BookChapter[], downloads: BookDownload[], layoutOverrides: LayoutOverride[]}} BookConfig */

/** @param {unknown} value @returns {value is Record<string, unknown>} */
const object = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
/** @param {unknown} value */
const string = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;
/** @param {unknown} value @param {number} count */
const page = (value, count) => Number.isInteger(value) && Number(value) >= 1 && Number(value) <= count ? Number(value) : null;

/** Restrict metadata colors to simple CSS hex values. @param {unknown} value */
export function safeColor(value) {
  return typeof value === 'string' && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value) ? value : null;
}

/** Accept only same-site paths or explicit HTTP(S) URLs. @param {unknown} value */
export function safeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const url = value.trim();
  if (/[\u0000-\u001f\u007f\\]/.test(url) || url.startsWith('//')) return null;
  try {
    const parsed = new URL(url, 'https://reader.invalid/');
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      !parsed.username && !parsed.password ? url : null;
  } catch { return null; }
}

/** Invalid targets are omitted with visible warnings, never clamped elsewhere. */
/** @param {unknown} raw @param {number} pageCount @param {string | null} [pdfFingerprint] @returns {{config: BookConfig | null, warnings: string[]}} */
export function normalizeBookConfig(raw, pageCount, pdfFingerprint = null) {
  /** @type {string[]} */
  const warnings = [];
  if (!object(raw) || !Number.isInteger(pageCount) || pageCount < 1) {
    return {config: null, warnings: ['Book metadata must be an object for a loaded PDF.']};
  }
  if (raw.pdfFingerprint !== undefined) {
    const expected = string(raw.pdfFingerprint);
    if (!expected) return {config: null, warnings: ['pdfFingerprint must be a non-empty string.']};
    if (pdfFingerprint && expected !== pdfFingerprint) {
      return {config: null, warnings: ['Book metadata describes a different PDF and was ignored.']};
    }
  }
  /** @type {BookConfig} */
  const config = {chapters: [], downloads: [], layoutOverrides: [], socialLinks: []};
  if (raw.pdfFingerprint !== undefined) config.pdfFingerprint = /** @type {string} */ (string(raw.pdfFingerprint));
  for (const field of /** @type {const} */ (['id', 'title', 'subtitle', 'description', 'language'])) {
    if (raw[field] === undefined) continue;
    const value = string(raw[field]);
    if (value) config[field] = value;
    else warnings.push(field + ' must be a non-empty string.');
  }

  if (raw.cover !== undefined) {
    if (!object(raw.cover)) warnings.push('cover must be an object.');
    else if (raw.cover.mode === 'pdf-page') {
      const target = page(raw.cover.page ?? 1, pageCount);
      if (target) config.cover = {mode: 'pdf-page', page: target};
      else warnings.push('cover.page is outside the PDF.');
    } else if (raw.cover.mode === 'image') {
      const src = safeUrl(raw.cover.src);
      if (src) config.cover = {mode: 'image', src};
      else warnings.push('cover.src must be a safe URL.');
    } else warnings.push('cover.mode must be pdf-page or image.');
  }
  if (raw.branding !== undefined) {
    if (!object(raw.branding)) warnings.push('branding must be an object.');
    else {
      /** @type {{logo?: string, alt?: string, favicon?: string}} */
      const branding = {};
      for (const field of /** @type {const} */ (['logo', 'favicon'])) {
        if (raw.branding[field] === undefined) continue;
        const url = safeUrl(raw.branding[field]);
        if (url) branding[field] = url; else warnings.push('branding.' + field + ' must be a safe URL.');
      }
      if (raw.branding.alt !== undefined) {
        const alt = string(raw.branding.alt);
        if (alt) branding.alt = alt; else warnings.push('branding.alt must be a non-empty string.');
      }
      if (Object.keys(branding).length) config.branding = branding;
    }
  }
  if (raw.theme !== undefined) {
    if (!object(raw.theme)) warnings.push('theme must be an object.');
    else {
      /** @type {NonNullable<BookConfig['theme']>} */
      const theme = {};
      for (const token of /** @type {const} */ (['background', 'surface', 'text', 'muted', 'accent'])) {
        if (raw.theme[token] === undefined) continue;
        const color = safeColor(raw.theme[token]);
        if (color) theme[token] = color; else warnings.push('theme.' + token + ' must be a hex color.');
      }
      if (Object.keys(theme).length) config.theme = theme;
    }
  }

  if (raw.publisher !== undefined) {
    if (!object(raw.publisher)) warnings.push('publisher must be an object.');
    else {
      /** @type {NonNullable<BookConfig['publisher']>} */
      const publisher = {};
      for (const field of /** @type {const} */ (['name', 'logo', 'website'])) {
        if (raw.publisher[field] === undefined) continue;
        const value = field === 'name' ? string(raw.publisher[field]) : safeUrl(raw.publisher[field]);
        if (value) publisher[field] = value;
        else warnings.push('publisher.' + field + ' must be a ' + (field === 'name' ? 'non-empty string.' : 'safe URL.'));
      }
      if (Object.keys(publisher).length) config.publisher = publisher;
    }
  }
  if (raw.socialLinks !== undefined && !Array.isArray(raw.socialLinks)) warnings.push('socialLinks must be an array.');
  else if (Array.isArray(raw.socialLinks)) raw.socialLinks.forEach((entry, index) => {
    const label = 'socialLinks[' + index + ']';
    if (!object(entry) || !['website', 'facebook', 'instagram', 'linkedin', 'x'].includes(String(entry.type))) {
      warnings.push(label + ' needs a supported type.'); return;
    }
    const href = safeUrl(entry.href);
    if (!href) { warnings.push(label + '.href must be a safe URL.'); return; }
    config.socialLinks.push({type: /** @type {SocialLink['type']} */ (entry.type), href});
  });
  if (raw.legal !== undefined) {
    if (!object(raw.legal)) warnings.push('legal must be an object.');
    else {
      /** @type {NonNullable<BookConfig['legal']>} */
      const legal = {};
      for (const field of /** @type {const} */ (['privacy', 'terms'])) {
        if (raw.legal[field] === undefined) continue;
        const href = safeUrl(raw.legal[field]);
        if (href) legal[field] = href; else warnings.push('legal.' + field + ' must be a safe URL.');
      }
      if (Object.keys(legal).length) config.legal = legal;
    }
  }
  if (raw.project !== undefined) {
    if (!object(raw.project)) warnings.push('project must be an object.');
    else if (raw.project.repositoryUrl !== undefined) {
      const repositoryUrl = safeUrl(raw.project.repositoryUrl);
      if (repositoryUrl) config.project = {repositoryUrl};
      else warnings.push('project.repositoryUrl must be a safe URL.');
    }
  }

  if (raw.chapters !== undefined && !Array.isArray(raw.chapters)) warnings.push('chapters must be an array.');
  else if (Array.isArray(raw.chapters)) {
    const ids = new Set();
    raw.chapters.forEach((entry, index) => {
      const label = 'chapters[' + index + ']';
      if (!object(entry)) { warnings.push(label + ' must be an object.'); return; }
      const id = string(entry.id), title = string(entry.title);
      const startPage = page(entry.startPage, pageCount);
      const endPage = entry.endPage === undefined ? undefined : page(entry.endPage, pageCount);
      if (!id || !title || !startPage || (entry.endPage !== undefined && (!endPage || endPage < startPage))) {
        warnings.push(label + ' needs an id, title, and valid page range.'); return;
      }
      if (ids.has(id)) { warnings.push(label + ' has a duplicate chapter id.'); return; }
      ids.add(id);
      /** @type {BookChapter} */
      const chapter = {id, title, startPage, items: []};
      if (endPage) chapter.endPage = endPage;
      if (entry.subtitle !== undefined) {
        const subtitle = string(entry.subtitle);
        if (subtitle) chapter.subtitle = subtitle; else warnings.push(label + '.subtitle must be a non-empty string.');
      }
      if (entry.color !== undefined) {
        const color = safeColor(entry.color);
        if (color) chapter.color = color; else warnings.push(label + '.color must be a hex color.');
      }
      if (entry.background !== undefined) {
        const background = safeUrl(entry.background);
        if (background) chapter.background = background; else warnings.push(label + '.background must be a safe URL.');
      }
      if (entry.items !== undefined && !Array.isArray(entry.items)) warnings.push(label + '.items must be an array.');
      else if (Array.isArray(entry.items)) {
        const itemIds = new Set();
        entry.items.forEach((item, itemIndex) => {
          const itemLabel = label + '.items[' + itemIndex + ']';
          if (!object(item)) { warnings.push(itemLabel + ' must be an object.'); return; }
          const itemTitle = string(item.title);
          const hasPage = item.page !== undefined;
          const hasRange = item.startPage !== undefined || item.endPage !== undefined;
          const target = page(hasPage ? item.page : item.startPage, pageCount);
          const itemEnd = item.endPage === undefined ? undefined : page(item.endPage, pageCount);
          if (!itemTitle || hasPage === hasRange || !target ||
              (item.endPage !== undefined && (!itemEnd || itemEnd < target))) {
            warnings.push(itemLabel + ' needs a title and one valid page or range target.'); return;
          }
          const itemId = item.id === undefined ? undefined : string(item.id);
          if (item.id !== undefined && !itemId) { warnings.push(itemLabel + '.id must be non-empty.'); return; }
          if (itemId && itemIds.has(itemId)) { warnings.push(itemLabel + ' has a duplicate item id.'); return; }
          if (itemId) itemIds.add(itemId);
          /** @type {BookItem} */
          const result = {title: itemTitle};
          if (itemId) result.id = itemId;
          if (hasPage) result.page = target;
          else { result.startPage = target; if (itemEnd) result.endPage = itemEnd; }
          if (item.subtitle !== undefined) {
            const subtitle = string(item.subtitle);
            if (subtitle) result.subtitle = subtitle; else warnings.push(itemLabel + '.subtitle must be non-empty.');
          }
          chapter.items.push(result);
        });
      }
      config.chapters.push(chapter);
    });
    config.chapters.sort((a, b) => a.startPage - b.startPage);
    config.chapters = config.chapters.filter((chapter, index, chapters) => {
      const next = chapters[index + 1];
      if (next && (chapter.startPage === next.startPage ||
          (chapter.endPage !== undefined && chapter.endPage >= next.startPage))) {
        warnings.push('Chapter ' + chapter.id + ' overlaps the next chapter and was omitted.');
        return false;
      }
      return true;
    });
  }

  if (raw.downloads !== undefined && !Array.isArray(raw.downloads)) warnings.push('downloads must be an array.');
  else if (Array.isArray(raw.downloads)) raw.downloads.forEach((entry, index) => {
    if (!object(entry)) { warnings.push('downloads[' + index + '] must be an object.'); return; }
    const label = string(entry.label), href = safeUrl(entry.href);
    if (label && href) config.downloads.push({label, href});
    else warnings.push('downloads[' + index + '] needs a label and safe URL.');
  });

  if (raw.layoutOverrides !== undefined && !Array.isArray(raw.layoutOverrides)) warnings.push('layoutOverrides must be an array.');
  else if (Array.isArray(raw.layoutOverrides)) {
    const covered = new Set();
    raw.layoutOverrides.forEach((entry, index) => {
      const label = 'layoutOverrides[' + index + ']';
      if (!object(entry) || (entry.mode !== 'single' && entry.mode !== 'spread')) {
        warnings.push(label + ' needs mode single or spread.'); return;
      }
      const onePage = entry.page !== undefined;
      const range = entry.startPage !== undefined || entry.endPage !== undefined;
      const startPage = page(onePage ? entry.page : entry.startPage, pageCount);
      const endPage = page(onePage ? entry.page : entry.endPage, pageCount);
      if (onePage === range || !startPage || !endPage || startPage > endPage) {
        warnings.push(label + ' needs one valid page or startPage/endPage range.'); return;
      }
      for (let number = startPage; number <= endPage; number += 1) {
        if (covered.has(number)) { warnings.push(label + ' overlaps another layout override.'); return; }
      }
      for (let number = startPage; number <= endPage; number += 1) covered.add(number);
      config.layoutOverrides.push({startPage, endPage, mode: entry.mode});
    });
  }
  return {config, warnings};
}
