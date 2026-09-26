import type {CSSProperties} from 'react';
import type {BookChapter, BookItem} from '../config/bookSchema.js';
import {itemTarget} from '../config/bookNavigation.js';

interface Props {
  chapters: BookChapter[];
  activeChapter: BookChapter | null;
  activeItem: BookItem | null;
  onSelect: (page: number) => void;
}

export function TableOfContents({chapters, activeChapter, activeItem, onSelect}: Props) {
  return (
    <aside className="toc-panel" aria-label="Table of contents">
      <h2>Contents</h2>
      <ol>
        {chapters.map((chapter) => (
          <li key={chapter.id} className="toc-chapter" style={chapter.color ? {'--chapter-accent': chapter.color} as CSSProperties : undefined}>
            <button
              type="button"
              className={activeChapter?.id === chapter.id ? 'current' : ''}
              aria-current={activeChapter?.id === chapter.id ? 'location' : undefined}
              aria-label={'Go to chapter ' + chapter.title + ', page ' + chapter.startPage}
              onClick={() => onSelect(chapter.startPage)}
            >
              <strong>{chapter.title}</strong>
              <span>Page {chapter.startPage}</span>
              {activeChapter?.id === chapter.id && <span className="current-label">Current chapter</span>}
              {chapter.subtitle && <small>{chapter.subtitle}</small>}
            </button>
            {chapter.items.length > 0 && (
              <ol className="toc-items">
                {chapter.items.map((item, index) => {
                  const target = itemTarget(item);
                  return (
                    <li key={item.id ?? chapter.id + ':' + index}>
                      <button
                        type="button"
                        className={activeItem === item ? 'current-item' : ''}
                        aria-current={activeItem === item ? 'location' : undefined}
                        aria-label={'Go to ' + item.title + ', page ' + target}
                        onClick={() => onSelect(target!)}
                      >
                        <span>{item.title}</span>
                        <span>Page {target}</span>
                        {activeItem === item && <span className="current-label">Current item</span>}
                        {item.subtitle && <small>{item.subtitle}</small>}
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </li>
        ))}
      </ol>
    </aside>
  );
}
