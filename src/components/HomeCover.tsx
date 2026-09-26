import {useEffect, useRef, useState} from 'react';
import type {PointerEvent as ReactPointerEvent} from 'react';
import type {BookConfig} from '../config/bookSchema.js';
import {DEFAULT_READER_TITLE, readerTitle} from '../config/displayMetadata.js';
import type {PdfDocumentService, PageGeometry} from '../pdf/PdfDocumentService';

interface Props {
  service: PdfDocumentService | null;
  config: BookConfig | null;
  firstPage: PageGeometry | undefined;
  currentPage: number;
  onEnter: () => void;
  error: string | null;
}

export function HomeCover({service, config, firstPage, currentPage, onEnter, error}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const imageCover = config?.cover?.mode === 'image' ? config.cover.src : null;
  const coverPage = config?.cover?.mode === 'pdf-page' ? config.cover.page ?? 1 : 1;

  useEffect(() => setImageFailed(false), [imageCover]);
  useEffect(() => {
    if (!service || (imageCover && !imageFailed) || !canvasRef.current) return;
    const controller = new AbortController();
    setPreviewReady(false);
    void service.renderThumbnail(coverPage, canvasRef.current, {width: 440, height: 620},
      controller.signal, window.devicePixelRatio || 1,
    ).then(() => {
      if (canvasRef.current) {
        canvasRef.current.style.width = '100%';
        canvasRef.current.style.height = '100%';
      }
      setPreviewReady(true);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) console.warn('Cover preview unavailable:', cause);
    });
    return () => controller.abort();
  }, [service, coverPage, imageCover, imageFailed]);

  const ratio = firstPage ? `${firstPage.width} / ${firstPage.height}` : '3 / 4';
  const onBookMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'touch') return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - 0.5;
    const y = (event.clientY - box.top) / box.height - 0.5;
    event.currentTarget.style.setProperty('--tilt-y', `${x * 9}deg`);
    event.currentTarget.style.setProperty('--tilt-x', `${-y * 5}deg`);
  };
  const onBookLeave = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.currentTarget.style.removeProperty('--tilt-y');
    event.currentTarget.style.removeProperty('--tilt-x');
  };
  return (
    <section className="home" aria-label="Book home">
      <div className="home-copy">
        <h1>{DEFAULT_READER_TITLE}</h1>
        {config?.title && <h2 className="home-publication-title">{config.title}</h2>}
        {config?.subtitle && <p>{config.subtitle}</p>}
        {error && <p className="home-error" role="alert">Could not open the PDF. {error}</p>}
      </div>
      <button className="home-book-button" type="button" onClick={onEnter} disabled={!service || Boolean(error)}
        onPointerMove={onBookMove} onPointerLeave={onBookLeave}
        aria-label={currentPage > 1 ? `Resume reading at page ${currentPage}` : 'Open book'}>
        <span className="home-book" style={{aspectRatio: ratio}}>
          {imageCover && !imageFailed ? (
            <img src={imageCover} alt="" onError={() => setImageFailed(true)} />
          ) : (
            <canvas ref={canvasRef} aria-hidden="true" style={{visibility: previewReady ? 'visible' : 'hidden'}} />
          )}
          {(!imageCover || imageFailed) && !previewReady ? <span className="home-cover-fallback">{readerTitle(config)}</span> : null}
        </span>
      </button>
      <p className="home-open-hint">{service ? (currentPage > 1 ? 'Resume reading' : 'Open book') : 'Loading book…'}</p>
    </section>
  );
}
