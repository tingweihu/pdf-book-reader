import {useEffect, useRef, useState} from 'react';
import type {RefObject} from 'react';
import {PdfDocumentService, type PageGeometry} from '../pdf/PdfDocumentService';
import {isThumbnailSelected, thumbnailTargets} from '../reader/thumbnails.js';

interface ThumbnailItemProps {
  service: PdfDocumentService;
  pageNumber: number;
  selected: boolean;
  panelRef: RefObject<HTMLDivElement | null>;
  onSelect: (pageNumber: number) => void;
}

function ThumbnailItem({
  service, pageNumber, selected, panelRef, onSelect,
}: ThumbnailItemProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const button = buttonRef.current;
    const panel = panelRef.current;
    if (!button || !panel) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => setVisible(entries.some((entry) => entry.isIntersecting)),
      {root: panel, rootMargin: '160px'},
    );
    observer.observe(button);
    return () => observer.disconnect();
  }, [panelRef]);

  useEffect(() => {
    if (selected) buttonRef.current?.scrollIntoView({block: 'nearest', inline: 'nearest'});
  }, [selected]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!visible) {
      canvas.width = 0;
      canvas.height = 0;
      setLoaded(false);
      setFailed(false);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setLoaded(false);
    setFailed(false);
    void service.renderThumbnail(
      pageNumber,
      canvas,
      {width: 124, height: 86},
      controller.signal,
      window.devicePixelRatio || 1,
    ).then(() => {
      if (active) setLoaded(true);
    }).catch((cause: unknown) => {
      if (!active || (cause instanceof Error && cause.name === 'RenderingCancelledException')) {
        return;
      }
      setFailed(true);
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [service, pageNumber, visible]);

  return (
    <button
      ref={buttonRef}
      type="button"
      className={'thumbnail' + (selected ? ' selected' : '')}
      aria-label={'Go to page ' + pageNumber}
      aria-current={selected ? 'page' : undefined}
      onClick={() => onSelect(pageNumber)}
    >
      <span className="thumbnail-preview">
        <canvas ref={canvasRef} aria-hidden="true" hidden={!loaded} />
        {!loaded && <span>{failed ? 'Preview unavailable' : 'Page ' + pageNumber}</span>}
      </span>
      <span className="thumbnail-number">{pageNumber}</span>
    </button>
  );
}

interface ThumbnailPanelProps {
  service: PdfDocumentService;
  pages: PageGeometry[];
  selectedPage: number;
  onSelect: (pageNumber: number) => void;
}

export function ThumbnailPanel({service, pages, selectedPage, onSelect}: ThumbnailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const selectedUnit = {pdfPage: selectedPage, segment: 'full' as const};
  return (
    <aside className="thumbnail-panel" aria-label="Page thumbnails">
      <div className="thumbnail-list" ref={panelRef}>
        {thumbnailTargets(pages).map((pageNumber) => (
          <ThumbnailItem
            key={pageNumber}
            service={service}
            pageNumber={pageNumber}
            selected={isThumbnailSelected(selectedUnit, pageNumber)}
            panelRef={panelRef}
            onSelect={onSelect}
          />
        ))}
      </div>
    </aside>
  );
}
