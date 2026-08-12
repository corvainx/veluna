import React, { useState, useRef, useLayoutEffect } from 'react';

interface VirtualTrackListProps<T> {
  items: T[];
  itemHeight?: number;
  overscan?: number;
  className?: string;
  style?: React.CSSProperties;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor?: (item: T, index: number) => string | number;
}

function getOffsetRelativeToScrollParent(el: HTMLElement, parent: HTMLElement | null): number {
  let top = 0;
  let curr: HTMLElement | null = el;
  while (curr && curr !== parent && curr !== document.body) {
    top += curr.offsetTop;
    curr = curr.offsetParent as HTMLElement | null;
  }
  return top;
}

export function VirtualTrackList<T>({
  items,
  itemHeight = 56,
  overscan = 24,
  className,
  style,
  renderItem,
  keyExtractor,
}: VirtualTrackListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ scrollTop: 0, viewportHeight: 800 });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Find scroll parent
    let scrollParent: HTMLElement | null = el.parentElement;
    while (scrollParent && scrollParent !== document.body) {
      const overflow = window.getComputedStyle(scrollParent).overflowY;
      if (overflow === 'auto' || overflow === 'scroll') {
        break;
      }
      scrollParent = scrollParent.parentElement;
    }

    const updateScroll = () => {
      if (!containerRef.current) return;
      
      const parentScrollTop = scrollParent ? scrollParent.scrollTop : window.scrollY;
      const initialContainerTop = getOffsetRelativeToScrollParent(containerRef.current, scrollParent);
      const relativeTop = parentScrollTop - initialContainerTop;
      const viewportH = scrollParent ? scrollParent.clientHeight : window.innerHeight;

      setScrollState({
        scrollTop: Math.max(0, relativeTop),
        viewportHeight: viewportH,
      });
    };

    updateScroll();

    if (scrollParent) {
      scrollParent.addEventListener('scroll', updateScroll, { passive: true });
    } else {
      window.addEventListener('scroll', updateScroll, { passive: true });
    }
    window.addEventListener('resize', updateScroll, { passive: true });

    return () => {
      if (scrollParent) {
        scrollParent.removeEventListener('scroll', updateScroll);
      } else {
        window.removeEventListener('scroll', updateScroll);
      }
      window.removeEventListener('resize', updateScroll);
    };
  }, [items.length]);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollState.scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(items.length, Math.ceil((scrollState.scrollTop + scrollState.viewportHeight) / itemHeight) + overscan);

  const visibleItems = items.slice(startIndex, endIndex);
  const paddingTop = startIndex * itemHeight;
  const paddingBottom = Math.max(0, (items.length - endIndex) * itemHeight);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        minHeight: totalHeight > 0 ? `${totalHeight}px` : 'auto',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <div
        style={{
          paddingTop: `${paddingTop}px`,
          paddingBottom: `${paddingBottom}px`,
          boxSizing: 'border-box',
        }}
      >
        {visibleItems.map((item, idx) => {
          const actualIndex = startIndex + idx;
          const key = keyExtractor ? keyExtractor(item, actualIndex) : (item as any)?.id || (item as any)?.url || actualIndex;
          return (
            <React.Fragment key={key}>
              {renderItem(item, actualIndex)}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
