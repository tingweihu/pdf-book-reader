[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

# PDF Book Reader

[Live Demo](https://pdf-book-reader-tau.vercel.app) · [GitHub Repository](https://github.com/tingweihu/pdf-book-reader)

PDF Book Reader is a publication-aware, open-source PDF reader for designed documents. It works with one PDF and can optionally use `book.json` for contents, branding, theme, and layout guidance.

## Why it exists

Designed PDFs often mix portrait pages with landscape pages that already contain a complete editorial spread. **One PDF page = one document page.** The reader keeps each landscape PDF page intact on desktop. On a narrow screen, a detected or configured composed spread can be read as left and right segments of that *same* page. It never pairs unrelated PDF pages.

## Features and uses

- A CSS 3D book home, page and keyboard navigation, thumbnails, fit/zoom/pan, fullscreen, page transitions, focus mode, and reduced-motion support.
- Page-based progress and resume in localStorage, with quiet 25/50/75/100% notices. System/light/dark appearance changes the reader chrome, never the PDF pixels.
- Optional contents, chapter-color arrows and backgrounds, publisher/footer links, theme, logo, and download links from `book.json`.
- Suitable for books, magazines, annual reports, white papers, catalogs, portfolios, brand books, editorial publications, learning materials, and designed PDF reports.

## Live demo

Explore the [Three Moments live demo](https://pdf-book-reader-tau.vercel.app). Its repository link points to the [public source](https://github.com/tingweihu/pdf-book-reader).

## Bundled demo publication

`Three Moments` is fictional demonstration content created specifically for this repository. It does not represent a real publication, company, client, organization, or commercial product. Its branding, food content, images, and publication design are demonstration material.

Bundled `public/EXAMPLE_*` files are replaceable demo assets: `EXAMPLE_BOOK.pdf`, `EXAMPLE_BOOK.json`, `EXAMPLE_MARK.png` (also the demo favicon), and `EXAMPLE_CHAPTER_01.png`, `EXAMPLE_CHAPTER_02.png`, `EXAMPLE_CHAPTER_03.png`. `public/favicon.svg` is a neutral reader fallback.

## Quick start

After cloning or downloading the project:

1. Run `npm install`.
2. Add your PDF as `public/book.pdf`.
3. Run `npm run dev` and open the URL Vite prints.

No reader code changes are needed. `book.pdf` takes priority over `EXAMPLE_BOOK.pdf`. Your PDF works without metadata: example metadata is fingerprint-bound and is quietly ignored when it describes a different PDF. Add `public/book.json` only when you want to configure your publication.

## Zero-config mode

For your own publication, only `public/book.pdf` is required. If it is absent, the bundled `EXAMPLE_BOOK.pdf` opens. Runtime geometry determines page count and initial single/spread mode. Home, navigation, thumbnails, zoom/pan, fullscreen, focus mode, appearance, and local progress still work. Without matching metadata, the title and theme are neutral; contents and configured links are hidden.

## Optional `book.json`

Put `book.json` beside `book.pdf` in `public/`. It can set a title/subtitle, cover, logo, chapters and items, theme colors, download links, and `layoutOverrides`. Page numbers are one-based PDF page numbers. For example:

```json
{
  "title": "Field Notes",
  "chapters": [{"id": "intro", "title": "Introduction", "startPage": 1, "color": "#345C7D"}],
  "theme": {"accent": "#345C7D"},
  "layoutOverrides": [
    {"page": 2, "mode": "single"},
    {"startPage": 3, "endPage": 4, "mode": "spread"}
  ],
  "downloads": [{"label": "PDF", "href": "/book.pdf"}]
}
```

Portrait pages are single by default; sufficiently wide landscape pages are spread candidates. Use `layoutOverrides` to keep a landscape PDF page full on narrow screens (`single`) or split a composed page into left/right reading segments (`spread`). Desktop always shows one complete PDF page at a time. Optional `pdfFingerprint` binds metadata to one PDF.

Optional `cover` selects an image or PDF page for home. `branding.logo` and `branding.favicon`, `chapters[].background`, `publisher` (name/logo/website), `socialLinks` (website/Facebook/Instagram/LinkedIn/X), `legal` (privacy/terms), and `project.repositoryUrl` fill only the slots you provide. URLs are validated; absent links are hidden. Config order: `book.json` → `publication.json` (compatibility) → `EXAMPLE_BOOK.json` → neutral defaults. A present but malformed higher-priority file warns rather than silently falling back.

## Project structure

```text
public/   Your book.pdf/book.json, replaceable EXAMPLE_* demo assets
src/      Generic reader and PDF rendering
tests/    Automated tests and an unrelated PDF fixture
scripts/  PDF geometry inspection
docs/     Architecture, release, and local review notes
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Typecheck and build production files |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | Check TypeScript and JSDoc types |
| `npm test` | Run automated tests |
| `npm run inspect:pdf` | Report geometry for `book.pdf`, or the example PDF if absent |

## Limitations

Automatic spread detection is a heuristic; use overrides when it guesses incorrectly. Progress is local to one browser and may be unavailable when storage is blocked. The reader does not provide cloud sync or a PDF uploader. See the [architecture notes](docs/architecture.md) and [local review checklist](docs/LOCAL_REVIEW.md).

## License

Source code: [MIT](LICENSE). Bundled demo publication assets: [CC BY 4.0](ASSET_PROVENANCE.md). Third-party dependencies retain their own licenses.
