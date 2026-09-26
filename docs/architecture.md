# Reader architecture

The reader treats each PDF page as one document page. PDF.js measures every page at runtime. The geometry classifier marks portrait pages `single` and wide landscape pages `spread`; optional `layoutOverrides` can correct either classification. A landscape page may contain a composed editorial spread. The reader never pairs two PDF pages into one spread.

`PdfDocumentService` owns loading, measurement, rendering, and render cancellation. Geometry and configuration normalization stay separate from PDF rendering. `ReadingUnit` is `{pdfPage, segment}`. Desktop uses one `full` unit per PDF page. On narrow viewports a `spread` page has `left` and `right` units, while a `single` page stays `full`. Navigation, thumbnails, progress, and page transitions all use this model.

The view state stores fit-relative zoom and bounded pan separately from the current ReadingUnit. Navigation and viewport-mode changes reset the view to fit. Fullscreen preserves the ReadingUnit and resets the view to fit. Page transitions present committed navigation; they do not decide the destination.

`book.pdf` wins over the bundled `EXAMPLE_BOOK.pdf`. Configuration priority is `book.json`, `publication.json` (compatibility), then `EXAMPLE_BOOK.json`. Example metadata is bound to its PDF fingerprint and is ignored quietly for a different PDF. Without matching metadata, the reader uses runtime geometry, a neutral theme, and the title **PDF Book Reader**. Invalid authored metadata is ignored where possible and displayed as a warning. Progress is keyed to the PDF identity and stored locally when storage is available.

The home/reader screen and focus mode are presentation state; switching screens keeps the ReadingUnit. Page-based progress thresholds are announced only after navigation crosses them, never during restore or left/right movement on one page. System/light/dark appearance affects chrome and stage only. Optional chapter backgrounds and footer links are validated metadata; they do not affect PDF rendering.
