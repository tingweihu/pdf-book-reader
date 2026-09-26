import type {BookConfig} from '../config/bookSchema.js';
import {nextAppearancePreference} from '../reader/experienceState.js';
import {MAX_ZOOM, MIN_ZOOM} from '../reader/viewState.js';
import {Icon} from './Icon';

type ReadingUnit = import('../reader/readingUnits.js').ReadingUnit;
type ReaderViewState = import('../reader/viewState.js').ReaderViewState;
type AppearancePreference = import('../reader/experienceState.js').AppearancePreference;

interface Props {
  config: BookConfig | null;
  unit: ReadingUnit;
  pageCount: number;
  currentIndex: number;
  unitCount: number;
  view: ReaderViewState;
  canRead: boolean;
  loadError: boolean;
  fullscreen: boolean;
  fullscreenSupported: boolean;
  tocOpen: boolean;
  thumbnailsOpen: boolean;
  focused: boolean;
  appearance: AppearancePreference;
  percent: number;
  interactionError: string | null;
  metadataWarnings: string[];
  onPrevious: () => void;
  onNext: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onFit: () => void;
  onFullscreen: () => void;
  onToggleToc: () => void;
  onToggleThumbnails: () => void;
  onToggleFocus: () => void;
  onAppearance: (value: AppearancePreference) => void;
}

export function ReaderToolbar({config, unit, pageCount, currentIndex,
  unitCount, view, canRead, loadError, fullscreen, fullscreenSupported, tocOpen, thumbnailsOpen,
  focused, appearance, percent, interactionError, metadataWarnings,
  onPrevious, onNext, onZoomOut, onZoomIn, onFit, onFullscreen, onToggleToc,
  onToggleThumbnails, onToggleFocus, onAppearance}: Props) {
  const appearanceLabel = `Appearance: ${appearance}. Switch to ${nextAppearancePreference(appearance)}`;
  return (
    <div className="reader-chrome">
      <div className="reader-toolbar" role="toolbar" aria-label="Reader controls">
        <div className="toolbar-group navigation" aria-label="Page navigation">
          <button type="button" disabled={pageCount < 1 || currentIndex <= 0} onClick={onPrevious}
            aria-label="Previous page" title="Previous page"><Icon name="previous" /></button>
          <span className="page-position" aria-live="polite">
            {pageCount ? `${unit.pdfPage} / ${pageCount}${unit.segment === 'full' ? '' : ' · ' + unit.segment}` : loadError ? 'PDF unavailable' : 'Loading PDF…'}
          </span>
          <button type="button" disabled={pageCount < 1 || currentIndex >= unitCount - 1} onClick={onNext}
            aria-label="Next page" title="Next page"><Icon name="next" /></button>
        </div>
        <div className="toolbar-group" aria-label="View controls">
          <button type="button" disabled={!canRead || view.zoom <= MIN_ZOOM} onClick={onZoomOut}
            aria-label="Zoom out" title="Zoom out"><Icon name="zoomOut" /></button>
          <span className="zoom-label" aria-live="polite">{Math.round(view.zoom * 100)}%</span>
          <button type="button" disabled={!canRead || (view.zoom === MIN_ZOOM && view.panX === 0 && view.panY === 0)}
            onClick={onFit} aria-label="Fit page" title="Fit page"><Icon name="fit" /></button>
          <button type="button" disabled={!canRead || view.zoom >= MAX_ZOOM} onClick={onZoomIn}
            aria-label="Zoom in" title="Zoom in"><Icon name="zoomIn" /></button>
        </div>
        <div className="toolbar-group toolbar-options" aria-label="Reader options">
          {Boolean(config?.chapters.length) && <button type="button" aria-label={tocOpen ? 'Hide contents' : 'Show contents'}
            title="Contents" aria-expanded={tocOpen} aria-controls="toc-panel" onClick={onToggleToc}><Icon name="contents" /></button>}
          <button type="button" disabled={!canRead} aria-label={thumbnailsOpen ? 'Hide thumbnails' : 'Show thumbnails'}
            title="Thumbnails" aria-expanded={thumbnailsOpen} aria-controls="thumbnail-panel" onClick={onToggleThumbnails}><Icon name="thumbnails" /></button>
          <button type="button" disabled={!fullscreenSupported} aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            title={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} onClick={onFullscreen}><Icon name={fullscreen ? 'exitFullscreen' : 'fullscreen'} /></button>
          <button type="button" aria-label={focused ? 'Exit focus mode' : 'Enter focus mode'}
            title={focused ? 'Exit focus mode' : 'Enter focus mode'} onClick={onToggleFocus}><Icon name={focused ? 'exitFocus' : 'focus'} /></button>
          <button type="button" aria-label={appearanceLabel} title={appearanceLabel}
            onClick={() => onAppearance(nextAppearancePreference(appearance))}><Icon name={appearance} /></button>
          {config?.downloads.map((download, index) => <a key={index} className="download-link" href={download.href}
            aria-label={`Download: ${download.label}`} title={`Download: ${download.label}`}><Icon name="download" /></a>)}
        </div>
        <div className="toolbar-progress" aria-label={'Reading progress ' + percent + ' percent'}>
          <progress value={percent} max="100" /><span>{percent}%</span>
        </div>
      </div>
      {interactionError && <div className="interaction-error" role="alert">{interactionError}</div>}
      {metadataWarnings.length > 0 && <div className="metadata-warning" role="alert">
        <strong>Book metadata warning</strong>
        <ul>{metadataWarnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
      </div>}
    </div>
  );
}
