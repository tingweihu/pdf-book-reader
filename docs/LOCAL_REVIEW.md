# Local product review

Start the development build with `npm run dev` and open the URL Vite prints. To review the production output, run `npm run build`, then `npm run preview` and open its printed URL. With no `book.pdf`, the bundled `EXAMPLE_BOOK.pdf` and matching `EXAMPLE_BOOK.json` provide the fictional demo.

## Desktop

- [ ] The CSS 3D home cover opens the reader; the top-left logo returns home and reopening resumes the same page.
- [ ] Cover and other portrait pages fit without excess empty space.
- [ ] A landscape page appears as one complete composed spread.
- [ ] Portrait ↔ landscape changes and page turns feel clear.
- [ ] Contents and thumbnails navigate to the expected PDF page.
- [ ] Zoom, pan, fit, and progress work; reload to check resume.
- [ ] Chapter changes update the subtle background and arrow color; progress notices appear at thresholds without repeat spam.
- [ ] Focus mode hides extra chrome; Escape restores it. System/light/dark affects chrome but not PDF artwork.
- [ ] Optional publisher and footer links appear only where configured.
- [ ] The final portrait page is reachable and navigation stops there.

## Narrow / mobile

- [ ] Portrait pages remain full; a composed spread reads left, then right.
- [ ] The toolbar, contents, and thumbnails remain usable.
- [ ] Focus mode, edge navigation, appearance control, and chapter atmosphere remain usable.
- [ ] The document has no horizontal overflow.

## Owner decision

“Would I be comfortable linking this demo publicly from the GitHub repository?”
