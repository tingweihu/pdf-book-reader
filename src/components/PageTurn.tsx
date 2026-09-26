import {useEffect} from 'react';
import type {ReactNode} from 'react';
import type {PageTurnState} from '../reader/pageTurn.js';
import {pageTurnFallbackDelay} from '../reader/pageTurn.js';

interface Props {
  turn: PageTurnState | null;
  readyUnitKey: string | null;
  onComplete: (id: number) => void;
  children: ReactNode;
}

/** Animation is disposable; navigation has already reached turn.to. */
export function PageTurn({turn, readyUnitKey, onComplete, children}: Props) {
  const targetKey = turn ? turn.to.pdfPage + ':' + turn.to.segment : null;
  const active = Boolean(turn && readyUnitKey === targetKey);

  useEffect(() => {
    if (!turn || !active) return;
    // CSS events can be suppressed by a browser or a mid-flight media change.
    const fallback = window.setTimeout(() => onComplete(turn.id), pageTurnFallbackDelay(turn));
    return () => window.clearTimeout(fallback);
  }, [turn, active, onComplete]);

  return (
    <div
      className={'turn-surface' + (active && turn ? ' turn-' + turn.kind + ' turn-' + turn.direction : '')}
      data-turn-kind={active ? turn?.kind : undefined}
      data-turn-direction={active ? turn?.direction : undefined}
      style={active && turn ? {'--turn-duration': turn.duration + 'ms'} as React.CSSProperties : undefined}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget && active && turn) onComplete(turn.id);
      }}
    >
      {children}
    </div>
  );
}
