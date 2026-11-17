import { useRef } from 'react';

/** Minimum sideways travel (px) before a touch counts as a swipe. */
const MIN_DISTANCE = 60;
/** Sideways travel must beat vertical travel by this factor, so scrolling never switches tabs. */
const DIRECTION_RATIO = 1.5;
/** Touches starting this close to the screen edge are left to the OS (iOS back gesture). */
const EDGE_GUARD = 24;
/** Slow drags are more likely reading/scrolling than a deliberate flick. */
const MAX_DURATION_MS = 700;

interface SwipeHandlers {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

/** Touch handlers to spread onto an element; calls back on a clear horizontal swipe. */
export function useHorizontalSwipe({ onSwipeLeft, onSwipeRight }: SwipeHandlers) {
  const start = useRef<{ x: number; y: number; t: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const nearEdge = touch.clientX < EDGE_GUARD || touch.clientX > window.innerWidth - EDGE_GUARD;
    start.current = e.touches.length === 1 && !nearEdge ? { x: touch.clientX, y: touch.clientY, t: Date.now() } : null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const s = start.current;
    start.current = null;
    if (!s) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - s.x;
    const dy = touch.clientY - s.y;
    if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * DIRECTION_RATIO) return;
    if (Date.now() - s.t > MAX_DURATION_MS) return;

    if (dx < 0) onSwipeLeft();
    else onSwipeRight();
  };

  // A second finger landing (pinch zoom) cancels the swipe.
  const onTouchCancel = () => {
    start.current = null;
  };

  return { onTouchStart, onTouchEnd, onTouchCancel };
}
