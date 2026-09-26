import type {ReactNode} from 'react';

export type IconName = 'previous' | 'next' | 'zoomOut' | 'zoomIn' | 'fit' | 'contents' |
  'thumbnails' | 'fullscreen' | 'exitFullscreen' | 'focus' | 'exitFocus' |
  'system' | 'light' | 'dark' | 'download' | 'home' | 'website' |
  'facebook' | 'instagram' | 'linkedin' | 'x' | 'privacy' | 'terms' | 'source';

const shapes: Record<IconName, ReactNode> = {
  previous: <path d="m14.5 5-7 7 7 7" />,
  next: <path d="m9.5 5 7 7-7 7" />,
  zoomOut: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="M7.5 10.5h6M15.5 15.5 21 21" /></>,
  zoomIn: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="M7.5 10.5h6m-3-3v6M15.5 15.5 21 21" /></>,
  fit: <path d="M8 3H4v4m12-4h4v4M4 17v4h4m12-4v4h-4M8 8h8v8H8z" />,
  contents: <><path d="M4 5h16M4 10h16M4 15h16M4 20h12" /><circle cx="3" cy="5" r=".6" fill="currentColor" stroke="none" /></>,
  thumbnails: <><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="8" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /><rect x="13" y="13" width="8" height="8" rx="1" /></>,
  fullscreen: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />,
  exitFullscreen: <path d="M3 8h5V3m13 5h-5V3M3 16h5v5m13-5h-5v5" />,
  focus: <><path d="M8 3H4v4m12-4h4v4M4 17v4h4m12-4v4h-4" /><circle cx="12" cy="12" r="2.5" /></>,
  exitFocus: <><path d="M4 4l16 16M20 4 4 20" /><circle cx="12" cy="12" r="8.5" /></>,
  system: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M9 21h6m-3-4v4" /></>,
  light: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" /></>,
  dark: <path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z" />,
  download: <path d="M12 3v12m-4-4 4 4 4-4M4 17v3h16v-3" />,
  home: <path d="m3 11 9-8 9 8M5 10v11h14V10m-10 11v-7h6v7" />,
  website: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c-3 3-3 15 0 18m0-18c3 3 3 15 0 18" /></>,
  facebook: <><circle cx="12" cy="12" r="9" /><path d="M14 7h-2a2 2 0 0 0-2 2v8m-2-5h6" /></>,
  instagram: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".7" fill="currentColor" stroke="none" /></>,
  linkedin: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7.5 10v7m0-10v.2M12 17v-7m0 2a3 3 0 0 1 6 0v5" /></>,
  x: <path d="M4 4 20 20M20 4 4 20" />,
  privacy: <><path d="M12 2 4 5v6c0 5 3 8 8 11 5-3 8-6 8-11V5Z" /><path d="m9 12 2 2 4-4" /></>,
  terms: <><path d="M6 2h9l4 4v16H6zM15 2v4h4M9 11h7M9 15h7M9 19h5" /></>,
  source: <><path d="m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16" /></>,
};

export function Icon({name, size = 20}: {name: IconName; size?: number}) {
  return <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    {shapes[name]}
  </svg>;
}
