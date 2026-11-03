import { useEffect, useRef, useState } from 'react';

/** Ширина элемента в пикселях; обновляется при изменении размера. 0 — пока не измерена. */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setWidth(Math.round(element.clientWidth)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}
