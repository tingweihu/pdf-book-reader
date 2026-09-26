import {useEffect, useRef, useState} from 'react';
import type {CSSProperties, PointerEvent as ReactPointerEvent, RefObject} from 'react';
import {PdfDocumentService, type PageGeometry, type RenderBounds} from '../pdf/PdfDocumentService';
import type {PageTurnState} from '../reader/pageTurn.js';
import {PageTurn} from './PageTurn';
import {Icon} from './Icon';

type ReadingUnit = import('../reader/readingUnits.js').ReadingUnit;
type ReaderViewState = import('../reader/viewState.js').ReaderViewState;
type FittedSize = ReturnType<typeof import('../reader/viewState.js').fitDimensions>;

interface PdfPageProps {
  service: PdfDocumentService;
  unit: ReadingUnit;
  bounds: RenderBounds;
  fitted: FittedSize;
  view: ReaderViewState;
  displayMode: PageGeometry['displayMode'];
  onError: (message: string) => void;
  onReady: (key: string) => void;
}

interface RenderedFrame {unitKey: string; width: number; height: number;}

function PdfPage({service, unit, bounds, fitted, view, displayMode, onError, onReady}: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frame, setFrame] = useState<RenderedFrame | null>(null);
  const [rendering, setRendering] = useState(true);
  const unitKey = unit.pdfPage + ':' + unit.segment;
  const frameMatches = frame?.unitKey === unitKey;
  const previewScale = frameMatches ? fitted.width * view.zoom / frame.width : 1;

  useEffect(() => {
    let active = true;
    setRendering(true);
    const timer = window.setTimeout(() => {
      const buffer = document.createElement('canvas');
      void service.renderPage(unit.pdfPage, unit.segment, buffer, bounds, view.zoom,
        window.devicePixelRatio || 1, displayMode,
      ).then((size) => {
        if (!active) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = buffer.width;
        canvas.height = buffer.height;
        canvas.style.width = size.width + 'px';
        canvas.style.height = size.height + 'px';
        const context = canvas.getContext('2d', {alpha: false});
        if (!context) throw new Error('Canvas 2D context is unavailable');
        context.drawImage(buffer, 0, 0);
        setFrame({unitKey, width: size.width, height: size.height});
        setRendering(false);
        onReady(unitKey);
      }).catch((cause: unknown) => {
        if (!active || (cause instanceof Error && cause.name === 'RenderingCancelledException')) return;
        onError(cause instanceof Error ? cause.message : String(cause));
      });
    }, 80);
    return () => {
      active = false;
      window.clearTimeout(timer);
      service.cancelRender();
    };
  }, [service, unit.pdfPage, unit.segment, bounds.width, bounds.height, view.zoom, displayMode, onError, onReady, unitKey]);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-label={'PDF page ' + unit.pdfPage + ', ' + unit.segment}
        style={{
          visibility: frameMatches ? 'visible' : 'hidden',
          transform: 'translate(' + view.panX + 'px, ' + view.panY + 'px) scale(' + previewScale + ')',
        }}
      />
      {!frameMatches && <div className="reader-placeholder" aria-hidden="true" style={{width: fitted.width, height: fitted.height}} />}
      {rendering && <div className="page-loading" role="status">Rendering page…</div>}
    </>
  );
}

interface Props {
  viewerRef: RefObject<HTMLElement | null>;
  hostRef: RefObject<HTMLDivElement | null>;
  service: PdfDocumentService | null;
  unit: ReadingUnit;
  geometry: PageGeometry | undefined;
  bounds: RenderBounds;
  fitted: FittedSize | null;
  view: ReaderViewState;
  error: string | null;
  onError: (message: string) => void;
  turn: PageTurnState | null;
  onTurnComplete: (id: number) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerEnd: (event: ReactPointerEvent<HTMLDivElement>) => void;
  background?: string | null;
  onPrevious: () => void;
  onNext: () => void;
  canPrevious: boolean;
  canNext: boolean;
}

export function ReaderStage({viewerRef, hostRef, service, unit, geometry, bounds, fitted, view,
  error, onError, turn, onTurnComplete, onPointerDown, onPointerMove, onPointerEnd,
  background, onPrevious, onNext, canPrevious, canNext}: Props) {
  const [readyUnitKey, setReadyUnitKey] = useState<string | null>(null);
  const [backgroundFailed, setBackgroundFailed] = useState(false);
  useEffect(() => setBackgroundFailed(false), [background]);
  return (
    <section className="viewer" aria-label="PDF reader" ref={viewerRef}
      style={{'--active-surface-half-width': `${(fitted?.width ?? 0) / 2}px`} as CSSProperties}>
      {background && !backgroundFailed && <img className="stage-atmosphere" src={background} alt="" onError={() => setBackgroundFailed(true)} />}
      <div
        className="page-host"
        ref={hostRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        style={{cursor: view.zoom > 1 ? 'grab' : 'default', touchAction: view.zoom > 1 ? 'none' : 'auto'}}
      >
        {error ? (
          <div className="message error" role="alert"><strong>Could not open the PDF.</strong><p>{error}</p></div>
        ) : service && fitted && geometry ? (
          <PageTurn turn={turn} readyUnitKey={readyUnitKey} onComplete={onTurnComplete}>
            <PdfPage service={service} unit={unit} bounds={bounds} fitted={fitted} view={view}
              displayMode={geometry.displayMode} onError={onError} onReady={setReadyUnitKey} />
          </PageTurn>
        ) : (
          <div className="message" role="status">Loading and measuring PDF pages…</div>
        )}
      </div>
      <button className="edge-nav edge-previous" type="button" aria-label="Previous page" disabled={!canPrevious} onClick={onPrevious}><Icon name="previous" size={23} /></button>
      <button className="edge-nav edge-next" type="button" aria-label="Next page" disabled={!canNext} onClick={onNext}><Icon name="next" size={23} /></button>
    </section>
  );
}
