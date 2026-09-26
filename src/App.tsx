import {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import type {CSSProperties, PointerEvent as ReactPointerEvent} from 'react';
import {ThumbnailPanel} from './components/Thumbnails';
import {TableOfContents} from './components/TableOfContents';
import {ReaderStage} from './components/ReaderStage';
import {ReaderToolbar} from './components/ReaderToolbar';
import {HomeCover} from './components/HomeCover';
import {ReaderFooter} from './components/ReaderFooter';
import {applyLayoutOverrides, currentChapter, currentItem} from './config/bookNavigation.js';
import {loadBookConfig} from './config/loadBookConfig.js';
import {selectPdfUrl} from './config/selectPdfUrl.js';
import {browserTitle, DEFAULT_READER_TITLE} from './config/displayMetadata.js';
import {PdfDocumentService, type PageGeometry, type RenderBounds} from './pdf/PdfDocumentService';
import {progressPercent, restoreReadingUnit} from './reader/progress.js';
import {LocalStorageProgressStorage, storedStateForUnit} from './reader/progressStorage.js';
import {
  createReadingUnits,
  mapReadingUnit,
  modeForViewport,
  stepReadingUnit,
} from './reader/readingUnits.js';
import {unitForThumbnail} from './reader/thumbnails.js';
import {commitPageTurn, sameUnit, settlePageTurn} from './reader/pageTurn.js';
import {appearancePreference, chapterPresentation, crossedProgressThreshold,
  atEndOfBook, nextFocusMode, resolvedAppearance, setScreen} from './reader/experienceState.js';
import {Icon} from './components/Icon';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  ZOOM_STEP,
  clampViewState,
  fitDimensions,
  fitViewState,
  panViewState,
  zoomViewState,
} from './reader/viewState.js';

type ReadingUnit = ReturnType<typeof createReadingUnits>[number];
type ReaderViewState = ReturnType<typeof fitViewState>;
type ProgressStorage = import('./reader/progressStorage.js').ProgressStorage;
type BookConfig = import('./config/bookSchema.js').BookConfig;
type PageTurnState = import('./reader/pageTurn.js').PageTurnState;
type ExperienceLocation = import('./reader/experienceState.js').ExperienceLocation;
type AppearancePreference = import('./reader/experienceState.js').AppearancePreference;

const defaultProgressStorage: ProgressStorage = new LocalStorageProgressStorage();

interface AppProps {
  progressStorage?: ProgressStorage;
}

export default function App({progressStorage = defaultProgressStorage}: AppProps = {}) {
  const [service, setService] = useState<PdfDocumentService | null>(null);
  const [geometry, setGeometry] = useState<PageGeometry[]>([]);
  const [config, setConfig] = useState<BookConfig | null>(null);
  const [metadataWarnings, setMetadataWarnings] = useState<string[]>([]);
  const [tocOpen, setTocOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [bookId, setBookId] = useState<string | null>(null);
  const [restoreReady, setRestoreReady] = useState(false);
  const [thumbnailsOpen, setThumbnailsOpen] = useState(false);
  const [experience, setExperience] = useState<ExperienceLocation>({screen: 'home', unit: {pdfPage: 1, segment: 'full'}});
  const {screen, unit} = experience;
  const unitRef = useRef<ReadingUnit>({pdfPage: 1, segment: 'full'});
  const [turn, setTurn] = useState<PageTurnState | null>(null);
  const turnSerialRef = useRef(0);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [view, setView] = useState<ReaderViewState>(fitViewState);
  const [bounds, setBounds] = useState<RenderBounds>({width: 0, height: 0});
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interactionError, setInteractionError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [notice, setNotice] = useState<number | null>(null);
  const announcedThresholdsRef = useRef<Set<number>>(new Set());
  const [appearance, setAppearance] = useState<AppearancePreference>(() => {
    try { return appearancePreference(window.localStorage.getItem('pdf-book-reader:appearance')); }
    catch { return 'system'; }
  });
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const appRef = useRef<HTMLElement>(null);
  const viewerRef = useRef<HTMLElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{pointerId: number; x: number; y: number} | null>(null);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(preference.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem('pdf-book-reader:appearance', appearance); }
    catch { /* Appearance remains usable without storage. */ }
  }, [appearance]);

  useEffect(() => {
    if (notice === null) return;
    const timer = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const host = hostRef.current;
    if (!viewer || !host) return;
    const measure = () => {
      setViewportWidth(viewer.clientWidth);
      setBounds((previous) => {
        const next = {width: host.clientWidth, height: host.clientHeight};
        return previous.width === next.width && previous.height === next.height ? previous : next;
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewer);
    observer.observe(host);
    return () => observer.disconnect();
  }, [screen]);

  useEffect(() => {
    let active = true;
    let reader: PdfDocumentService | null = null;
    const load = async () => {
        const url = await selectPdfUrl();
        if (!active) return;
        const documentService = new PdfDocumentService(url);
        reader = documentService;
        await documentService.load();
        const pages = await documentService.measureAllPages();
        const loaded = await loadBookConfig(pages.length, undefined, documentService.pdfFingerprint);
        const effectivePages = applyLayoutOverrides(pages, loaded.config?.layoutOverrides ?? []);
        const id = documentService.bookId;
        let saved = null;
        try {
          if (id) saved = await progressStorage.load(id);
        } catch {
          // A failing storage implementation must not block the PDF.
        }
        if (!active) return;
        const mode = modeForViewport(viewerRef.current?.clientWidth || window.innerWidth);
        const restored = restoreReadingUnit(saved, effectivePages, mode);
        announcedThresholdsRef.current = new Set(
          [25, 50, 75, 100].filter((threshold) => threshold <= progressPercent(restored.pdfPage, effectivePages.length)),
        );
        unitRef.current = restored;
        setExperience((previous) => ({...previous, unit: restored}));
        setGeometry(effectivePages);
        setConfig(loaded.config);
        setMetadataWarnings(loaded.warnings);
        setBookId(id);
        setService(documentService);
        setRestoreReady(true);
    };
    void load().catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => {
      active = false;
      void reader?.destroy();
    };
  }, [progressStorage]);

  const pageCount = geometry.length;
  const viewportMode = modeForViewport(viewportWidth);
  const readingUnits = useMemo(
    () => createReadingUnits(geometry, viewportMode),
    [geometry, viewportMode],
  );
  const currentUnit = pageCount ? mapReadingUnit(unit, geometry, viewportMode) : unit;
  const currentGeometry = geometry[currentUnit.pdfPage - 1];
  const fitted = useMemo(
    () => currentGeometry && bounds.width > 0 && bounds.height > 0
      ? fitDimensions(currentGeometry, currentUnit.segment, bounds)
      : null,
    [currentGeometry, currentUnit.segment, bounds],
  );
  const currentIndex = readingUnits.findIndex(
    (candidate) => candidate.pdfPage === currentUnit.pdfPage && candidate.segment === currentUnit.segment,
  );
  const percent = progressPercent(currentUnit.pdfPage, pageCount);
  const activeChapter = currentChapter(config?.chapters ?? [], currentUnit.pdfPage, pageCount);
  const activeItem = currentItem(activeChapter, currentUnit.pdfPage);
  const chapterVisual = chapterPresentation(activeChapter);
  const dark = resolvedAppearance(appearance, systemDark) === 'dark';
  const themeStyle = {
    '--reader-bg': dark ? '#151A1E' : config?.theme?.background ?? '#F4F4F4',
    '--reader-surface': dark ? '#222B31' : config?.theme?.surface ?? '#FFFFFF',
    '--reader-text': dark ? '#F2F4F5' : config?.theme?.text ?? '#202124',
    '--reader-muted': dark ? '#C1CBD0' : config?.theme?.muted ?? '#5B5B5B',
    '--reader-accent': config?.theme?.accent ?? '#42637C',
    '--chapter-accent': chapterVisual.accent,
  } as CSSProperties;

  useEffect(() => {
    document.title = browserTitle(config);
    document.documentElement.lang = config?.language || 'en';
  }, [config?.title, config?.language]);

  useEffect(() => {
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!icon) return;
    const fallback = '/favicon.svg';
    const onError = () => { icon.type = 'image/svg+xml'; icon.href = fallback; };
    icon.type = config?.branding?.favicon ? '' : 'image/svg+xml';
    icon.href = config?.branding?.favicon || fallback;
    icon.addEventListener('error', onError);
    return () => icon.removeEventListener('error', onError);
  }, [config?.branding?.favicon]);

  useEffect(() => setLogoFailed(false), [config?.branding?.logo]);

  useEffect(() => {
    if (!restoreReady || !bookId || pageCount < 1) return;
    void progressStorage.save(bookId, storedStateForUnit(currentUnit)).catch(() => {
      // A custom adapter may reject; persistence remains optional.
    });
  }, [progressStorage, restoreReady, bookId, pageCount, currentUnit.pdfPage, currentUnit.segment]);

  useEffect(() => {
    if (!pageCount) return;
    const mapped = mapReadingUnit(unitRef.current, geometry, viewportMode);
    if (!sameUnit(mapped, unitRef.current)) {
      unitRef.current = mapped;
      setExperience((previous) => ({...previous, unit: mapped}));
      setTurn(null);
    }
  }, [geometry, pageCount, viewportMode]);

  useLayoutEffect(() => {
    setView(fitViewState());
    setTurn(null);
    dragRef.current = null;
  }, [viewportMode]);

  useLayoutEffect(() => {
    if (!fitted) return;
    setView((previous) => {
      const next = clampViewState(previous, fitted, bounds);
      return next.zoom === previous.zoom && next.panX === previous.panX && next.panY === previous.panY
        ? previous
        : next;
    });
  }, [fitted, bounds]);

  useEffect(() => {
    const syncFullscreen = () => {
      setFullscreen(document.fullscreenElement === appRef.current);
      setView(fitViewState());
      setTurn(null);
      setInteractionError(null);
      dragRef.current = null;
    };
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  const commitLocation = useCallback((next: ReadingUnit) => {
    const committed = commitPageTurn(
      {unit: unitRef.current, turn: null, serial: turnSerialRef.current},
      next, geometry, reducedMotion,
    );
    if (sameUnit(unitRef.current, committed.unit)) return;
    const threshold = crossedProgressThreshold(
      progressPercent(unitRef.current.pdfPage, pageCount),
      progressPercent(committed.unit.pdfPage, pageCount),
    );
    unitRef.current = committed.unit;
    turnSerialRef.current = committed.serial;
    setExperience((previous) => ({...previous, unit: committed.unit}));
    setView(fitViewState());
    setTurn(committed.turn);
    if (threshold !== null && !announcedThresholdsRef.current.has(threshold)) {
      for (const milestone of [25, 50, 75, 100]) {
        if (milestone <= threshold) announcedThresholdsRef.current.add(milestone);
      }
      setNotice(threshold);
    }
    dragRef.current = null;
  }, [geometry, reducedMotion, pageCount]);

  const navigate = useCallback((direction: -1 | 1) => {
    if (!pageCount) return;
    commitLocation(stepReadingUnit(unitRef.current, geometry, viewportMode, direction));
  }, [commitLocation, geometry, pageCount, viewportMode]);

  const selectPageTarget = useCallback((targetPage: number) => {
    if (!pageCount) return;
    commitLocation(unitForThumbnail(targetPage, geometry, viewportMode));
  }, [commitLocation, geometry, pageCount, viewportMode]);

  const completeTurn = useCallback((id: number) => {
    setTurn((active) => settlePageTurn(active, id));
  }, []);

  const changeZoom = useCallback((factor: number) => {
    if (!fitted) return;
    setView((previous) => zoomViewState(previous, previous.zoom * factor, fitted, bounds));
  }, [fitted, bounds]);

  const resetFit = useCallback(() => {
    setView(fitViewState());
    dragRef.current = null;
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && focused) {
        setFocused(nextFocusMode(focused, 'escape'));
        return;
      }
      if (screen !== 'reader' || pageCount < 1) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      ) {
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigate(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigate(1);
      } else if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        changeZoom(ZOOM_STEP);
      } else if (event.key === '-') {
        event.preventDefault();
        changeZoom(1 / ZOOM_STEP);
      } else if (event.key === '0') {
        event.preventDefault();
        resetFit();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pageCount, navigate, changeZoom, resetFit, screen, focused]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !fitted) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * 0.01);
      setView((previous) => zoomViewState(previous, previous.zoom * factor, fitted, bounds));
    };
    viewer.addEventListener('wheel', onWheel, {passive: false});
    return () => viewer.removeEventListener('wheel', onWheel);
  }, [fitted, bounds]);

  const toggleFullscreen = async () => {
    setInteractionError(null);
    try {
      if (document.fullscreenElement === appRef.current) {
        await document.exitFullscreen();
      } else if (appRef.current?.requestFullscreen) {
        await appRef.current.requestFullscreen();
      } else {
        throw new Error('Fullscreen is not available in this browser');
      }
    } catch (cause) {
      setInteractionError('Could not change fullscreen: ' +
        (cause instanceof Error ? cause.message : String(cause)));
    }
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !fitted || view.zoom <= MIN_ZOOM) return;
    event.preventDefault();
    dragRef.current = {pointerId: event.pointerId, x: event.clientX, y: event.clientY};
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !fitted) return;
    const deltaX = event.clientX - drag.x;
    const deltaY = event.clientY - drag.y;
    drag.x = event.clientX;
    drag.y = event.clientY;
    setView((previous) => panViewState(previous, deltaX, deltaY, fitted, bounds));
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const canRead = Boolean(service && fitted && !error);
  const finished = atEndOfBook(currentIndex, readingUnits.length);
  const fullscreenSupported = typeof document.documentElement.requestFullscreen === 'function';
  const openReader = () => {
    setExperience((previous) => setScreen(previous, 'reader'));
    setView(fitViewState());
  };
  const returnHome = () => {
    setExperience((previous) => setScreen(previous, 'home'));
    setFocused(nextFocusMode(focused, 'home'));
    setTocOpen(false);
    setThumbnailsOpen(false);
    setNotice(null);
  };

  return (
    <main className={'app experience-' + screen + (focused ? ' focus-mode' : '')} ref={appRef}
      style={themeStyle} data-appearance={dark ? 'dark' : 'light'}>
      {screen === 'home' ? (
        <>
          <HomeCover service={service} config={config}
            firstPage={geometry[(config?.cover?.mode === 'pdf-page' ? config.cover.page ?? 1 : 1) - 1]}
            currentPage={currentUnit.pdfPage} onEnter={openReader} error={error} />
          <ReaderFooter config={config} home />
        </>
      ) : (
        <>
          {!focused && <header className="top-chrome">
            <button type="button" className="home-link book-identity" onClick={returnHome} aria-label="Return home">
              {config?.branding?.logo && !logoFailed && <img src={config.branding.logo}
                alt={config.branding.alt || ''} onError={() => setLogoFailed(true)} />}
              <span><strong>{DEFAULT_READER_TITLE}</strong>{config?.title && <small>{config.title}</small>}</span>
            </button>
            <div className="reading-context" aria-live="polite">
              {activeChapter && <span className="current-chapter">{activeChapter.title}{activeItem ? ' · ' + activeItem.title : ''}</span>}
              {currentGeometry && <span className="geometry-label">{currentGeometry.orientation} · {currentGeometry.displayMode}</span>}
            </div>
          </header>}
          {notice !== null && !focused && <div className="progress-notice" role="status">
            {notice === 100 ? 'Reading complete' : `${notice}% through this book`}
          </div>}
          {focused && <button type="button" className="focus-exit" onClick={() => setFocused(false)} aria-label="Exit focus mode">Exit focus</button>}
          <div className="reader-layout">
            {!focused && tocOpen && Boolean(config?.chapters.length) && (
              <div id="toc-panel">
                <TableOfContents chapters={config!.chapters} activeChapter={activeChapter} activeItem={activeItem} onSelect={selectPageTarget} />
              </div>
            )}
            {!focused && thumbnailsOpen && service && (
              <div id="thumbnail-panel">
                <ThumbnailPanel service={service} pages={geometry} selectedPage={currentUnit.pdfPage} onSelect={selectPageTarget} />
              </div>
            )}
            <ReaderStage viewerRef={viewerRef} hostRef={hostRef} service={service} unit={currentUnit}
              geometry={currentGeometry} bounds={bounds} fitted={fitted} view={view} error={error}
              onError={setError} turn={turn} onTurnComplete={completeTurn}
              onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerEnd={onPointerEnd}
              background={activeChapter?.background} onPrevious={() => navigate(-1)} onNext={() => navigate(1)}
              canPrevious={currentIndex > 0} canNext={currentIndex >= 0 && currentIndex < readingUnits.length - 1} />
          </div>
          {finished && !focused && <div className="end-of-book" role="status">
            <span>End of book</span>
            <button type="button" onClick={returnHome} aria-label="Return home after finishing">
              <Icon name="home" size={16} /> <span>Return home</span>
            </button>
          </div>}
          {!focused && <ReaderToolbar config={config} unit={currentUnit} pageCount={pageCount}
            currentIndex={currentIndex} unitCount={readingUnits.length} view={view} canRead={canRead}
            fullscreen={fullscreen} fullscreenSupported={fullscreenSupported} loadError={Boolean(error)}
            tocOpen={tocOpen} thumbnailsOpen={thumbnailsOpen} focused={focused} appearance={appearance}
            percent={percent} interactionError={interactionError} metadataWarnings={metadataWarnings}
            onPrevious={() => navigate(-1)} onNext={() => navigate(1)}
            onZoomOut={() => changeZoom(1 / ZOOM_STEP)} onZoomIn={() => changeZoom(ZOOM_STEP)} onFit={resetFit}
            onFullscreen={() => void toggleFullscreen()}
            onToggleToc={() => { setTocOpen(!tocOpen); if (!tocOpen) setThumbnailsOpen(false); }}
            onToggleThumbnails={() => { setThumbnailsOpen(!thumbnailsOpen); if (!thumbnailsOpen) setTocOpen(false); }}
            onToggleFocus={() => setFocused(nextFocusMode(focused, 'toggle'))}
            onAppearance={setAppearance} />}
          {!focused && <ReaderFooter config={config} />}
        </>
      )}
    </main>
  );
}
