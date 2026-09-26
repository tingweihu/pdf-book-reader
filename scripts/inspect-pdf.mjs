import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {getDocument, GlobalWorkerOptions} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {classifyPage} from '../src/reader/geometry.js';

/**
 * Measure the PDF's real page boxes using the installed PDF.js version.
 * @param {string | URL} filePath
 */
export async function inspectPdfFile(filePath) {
  GlobalWorkerOptions.workerSrc = import.meta.resolve(
    'pdfjs-dist/legacy/build/pdf.worker.mjs',
  );
  const bytes = new Uint8Array(await readFile(filePath));
  const loadingTask = getDocument({data: bytes});
  try {
    const document = await loadingTask.promise;
    const geometry = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({scale: 1});
      geometry.push(classifyPage(pageNumber, viewport.width, viewport.height));
    }
    return geometry;
  } finally {
    await loadingTask.destroy();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const userPdf = new URL('../public/book.pdf', import.meta.url);
  const filePath = process.argv[2] ?? (existsSync(userPdf) ? userPdf : new URL('../public/EXAMPLE_BOOK.pdf', import.meta.url));
  try {
    const pages = await inspectPdfFile(filePath);
    console.log('Page  Width  Height  Orientation  Display mode');
    for (const page of pages) {
      console.log(
        String(page.pageNumber).padStart(4) + '  ' +
        String(page.width).padStart(5) + '  ' +
        String(page.height).padStart(6) + '  ' +
        page.orientation.padEnd(11) + '  ' +
        page.displayMode,
      );
    }
  } catch (error) {
    console.error('PDF inspection failed:', error);
    process.exitCode = 1;
  }
}
