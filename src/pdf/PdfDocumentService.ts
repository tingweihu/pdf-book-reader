import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentLoadingTask,
  type PDFDocumentProxy,
  type RenderTask,
} from 'pdfjs-dist';
import {classifyPage} from '../reader/geometry.js';
import {clampZoom, fitDimensions} from '../reader/viewState.js';

export type PageGeometry = ReturnType<typeof classifyPage>;

export interface RenderBounds {
  width: number;
  height: number;
}

export interface RenderSize {
  width: number;
  height: number;
}

export type RenderSegment = 'full' | 'left' | 'right';

interface ThumbnailJob {
  pageNumber: number;
  canvas: HTMLCanvasElement;
  bounds: RenderBounds;
  signal: AbortSignal;
  devicePixelRatio: number;
  resolve: () => void;
  reject: (error: unknown) => void;
  onAbort: () => void;
}

const MAX_CANVAS_PIXELS = 24_000_000;
const MAX_CANVAS_EDGE = 8192;

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function missingOrFailedPdfRequest(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {method: 'HEAD'});
    if (response.status === 404 || response.status === 410 ||
        response.headers.get('content-type')?.toLowerCase().includes('text/html')) {
      return 'PDF file was not found at ' + url + '.';
    }
    if (!response.ok) return 'PDF request failed (HTTP ' + response.status + ').';
  } catch {
    // PDF.js already has the more useful original load error.
  }
  return null;
}

function cancelledRender(): Error {
  const error = new Error('PDF render was cancelled');
  error.name = 'RenderingCancelledException';
  return error;
}

/** Owns one PDF document and renders one PDF page per view. */
export class PdfDocumentService {
  private loadingTask: PDFDocumentLoadingTask | null = null;
  private document: PDFDocumentProxy | null = null;
  private geometryCache = new Map<number, PageGeometry>();
  private renderTask: RenderTask | null = null;
  private renderGeneration = 0;
  private renderTail: Promise<void> = Promise.resolve();
  private thumbnailQueue: ThumbnailJob[] = [];
  private activeThumbnailCount = 0;
  private thumbnailTasks = new Set<RenderTask>();
  private thumbnailOperations = new Set<Promise<void>>();

  constructor(readonly url: string) {
    if (!url) throw new Error('PDF URL is required');
    GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();
  }

  get pageCount(): number {
    return this.document?.numPages ?? 0;
  }

  get bookId(): string | null {
    const fingerprint = this.pdfFingerprint;
    return fingerprint ? 'pdf-book-reader:v1:' + fingerprint : null;
  }

  get pdfFingerprint(): string | null {
    const fingerprints = this.document?.fingerprints;
    const fingerprint = fingerprints?.[1] || fingerprints?.[0];
    return fingerprint || null;
  }

  async load(): Promise<number> {
    if (this.document) return this.document.numPages;
    try {
      this.loadingTask = getDocument({url: this.url});
      this.document = await this.loadingTask.promise;
      return this.document.numPages;
    } catch (error) {
      this.loadingTask = null;
      const requestError = await missingOrFailedPdfRequest(this.url);
      throw new Error(requestError ?? ('Unable to load PDF: ' + messageOf(error)));
    }
  }

  async measurePage(pageNumber: number): Promise<PageGeometry> {
    const document = this.requireDocument();
    this.assertPageNumber(pageNumber, document.numPages);
    const cached = this.geometryCache.get(pageNumber);
    if (cached) return cached;

    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({scale: 1});
    const geometry = classifyPage(pageNumber, viewport.width, viewport.height);
    this.geometryCache.set(pageNumber, geometry);
    return geometry;
  }

  async measureAllPages(): Promise<PageGeometry[]> {
    const document = this.requireDocument();
    const geometry: PageGeometry[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      geometry.push(await this.measurePage(pageNumber));
    }
    return geometry;
  }

  async renderPage(
    pageNumber: number,
    segment: RenderSegment,
    canvas: HTMLCanvasElement,
    bounds: RenderBounds,
    requestedZoom = 1,
    devicePixelRatio = 1,
    effectiveDisplayMode?: PageGeometry['displayMode'],
  ): Promise<RenderSize> {
    const generation = ++this.renderGeneration;
    this.renderTask?.cancel();

    const previousRender = this.renderTail;
    let releaseRender: () => void = () => undefined;
    this.renderTail = new Promise<void>((resolve) => {
      releaseRender = resolve;
    });
    await previousRender;

    try {
      if (generation !== this.renderGeneration) throw cancelledRender();
      const document = this.requireDocument();
      this.assertPageNumber(pageNumber, document.numPages);
      if (bounds.width <= 0 || bounds.height <= 0) {
        throw new RangeError('Render bounds must be positive');
      }

      const page = await document.getPage(pageNumber);
      const geometry = await this.measurePage(pageNumber);
      if (generation !== this.renderGeneration) throw cancelledRender();

      if (segment !== 'full' && segment !== 'left' && segment !== 'right') {
        throw new RangeError('Render segment must be full, left, or right');
      }
      if (segment !== 'full' && (effectiveDisplayMode ?? geometry.displayMode) !== 'spread') {
        throw new RangeError('Only a composed spread can render a half-page segment');
      }

      const fitted = fitDimensions(geometry, segment, bounds);
      const viewport = page.getViewport({scale: fitted.scale * clampZoom(requestedZoom)});
      const visibleWidth = segment === 'full' ? viewport.width : viewport.width / 2;
      const cropOffset = segment === 'right' ? viewport.width / 2 : 0;
      const requestedPixelRatio = Number.isFinite(devicePixelRatio)
        ? Math.max(1, Math.min(devicePixelRatio, 2))
        : 1;
      const pixelRatio = Math.min(
        requestedPixelRatio,
        Math.sqrt(MAX_CANVAS_PIXELS / (visibleWidth * viewport.height)),
        MAX_CANVAS_EDGE / Math.max(visibleWidth, viewport.height),
      );

      canvas.width = Math.max(1, Math.ceil(visibleWidth * pixelRatio));
      canvas.height = Math.max(1, Math.ceil(viewport.height * pixelRatio));
      canvas.style.width = String(visibleWidth) + 'px';
      canvas.style.height = String(viewport.height) + 'px';

      const context = canvas.getContext('2d', {alpha: false});
      if (!context) throw new Error('Canvas 2D context is unavailable');

      this.renderTask = page.render({
        canvas,
        canvasContext: context,
        viewport,
        transform: [pixelRatio, 0, 0, pixelRatio, -cropOffset * pixelRatio, 0],
      });
      await this.renderTask.promise;
      if (generation !== this.renderGeneration) throw cancelledRender();

      return {width: visibleWidth, height: viewport.height};
    } catch (error) {
      if (
        generation !== this.renderGeneration ||
        (error instanceof Error && error.name === 'RenderingCancelledException')
      ) {
        throw cancelledRender();
      }
      throw new Error('Unable to render page ' + pageNumber + ': ' + messageOf(error));
    } finally {
      this.renderTask = null;
      releaseRender();
    }
  }

  cancelRender(): void {
    this.renderGeneration += 1;
    this.renderTask?.cancel();
  }

  /**
   * A separate, two-worker queue keeps thumbnail work from cancelling the
   * main reader canvas. Both paths reuse this one loaded PDFDocumentProxy.
   */
  renderThumbnail(
    pageNumber: number,
    canvas: HTMLCanvasElement,
    bounds: RenderBounds,
    signal: AbortSignal,
    devicePixelRatio = 1,
  ): Promise<void> {
    if (signal.aborted) return Promise.reject(cancelledRender());
    return new Promise<void>((resolve, reject) => {
      const job: ThumbnailJob = {
        pageNumber, canvas, bounds, signal, devicePixelRatio, resolve, reject,
        onAbort: () => {
          const index = this.thumbnailQueue.indexOf(job);
          if (index >= 0) {
            this.thumbnailQueue.splice(index, 1);
            reject(cancelledRender());
          }
        },
      };
      signal.addEventListener('abort', job.onAbort, {once: true});
      this.thumbnailQueue.push(job);
      this.pumpThumbnails();
    });
  }

  async destroy(): Promise<void> {
    this.cancelRender();
    for (const job of this.thumbnailQueue.splice(0)) {
      job.signal.removeEventListener('abort', job.onAbort);
      job.reject(cancelledRender());
    }
    for (const task of this.thumbnailTasks) task.cancel();
    await Promise.allSettled([this.renderTail, ...this.thumbnailOperations]);
    this.geometryCache.clear();
    this.document = null;
    await this.loadingTask?.destroy();
    this.loadingTask = null;
  }

  private pumpThumbnails(): void {
    while (this.activeThumbnailCount < 2 && this.thumbnailQueue.length > 0) {
      const job = this.thumbnailQueue.shift()!;
      job.signal.removeEventListener('abort', job.onAbort);
      if (job.signal.aborted) {
        job.reject(cancelledRender());
        continue;
      }
      this.activeThumbnailCount += 1;
      const operation = this.performThumbnail(job);
      this.thumbnailOperations.add(operation);
      void operation.then(job.resolve, job.reject).finally(() => {
        this.thumbnailOperations.delete(operation);
        this.activeThumbnailCount -= 1;
        this.pumpThumbnails();
      });
    }
  }

  private async performThumbnail(job: ThumbnailJob): Promise<void> {
    const document = this.requireDocument();
    this.assertPageNumber(job.pageNumber, document.numPages);
    if (job.bounds.width <= 0 || job.bounds.height <= 0) {
      throw new RangeError('Thumbnail bounds must be positive');
    }
    const page = await document.getPage(job.pageNumber);
    if (job.signal.aborted) throw cancelledRender();
    const geometry = await this.measurePage(job.pageNumber);
    if (job.signal.aborted) throw cancelledRender();
    const scale = Math.min(
      job.bounds.width / geometry.width,
      job.bounds.height / geometry.height,
    );
    const viewport = page.getViewport({scale});
    const ratio = Number.isFinite(job.devicePixelRatio)
      ? Math.max(1, Math.min(job.devicePixelRatio, 1.5))
      : 1;
    job.canvas.width = Math.max(1, Math.ceil(viewport.width * ratio));
    job.canvas.height = Math.max(1, Math.ceil(viewport.height * ratio));
    job.canvas.style.width = String(viewport.width) + 'px';
    job.canvas.style.height = String(viewport.height) + 'px';
    const context = job.canvas.getContext('2d', {alpha: false});
    if (!context) throw new Error('Thumbnail canvas 2D context is unavailable');
    const task = page.render({
      canvas: job.canvas,
      canvasContext: context,
      viewport,
      transform: [ratio, 0, 0, ratio, 0, 0],
    });
    this.thumbnailTasks.add(task);
    const onAbort = () => task.cancel();
    job.signal.addEventListener('abort', onAbort, {once: true});
    try {
      await task.promise;
      if (job.signal.aborted) throw cancelledRender();
    } finally {
      job.signal.removeEventListener('abort', onAbort);
      this.thumbnailTasks.delete(task);
    }
  }

  private requireDocument(): PDFDocumentProxy {
    if (!this.document) throw new Error('PDF is not loaded');
    return this.document;
  }

  private assertPageNumber(pageNumber: number, pageCount: number): void {
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pageCount) {
      throw new RangeError('Page ' + pageNumber + ' is outside 1–' + pageCount);
    }
  }
}
