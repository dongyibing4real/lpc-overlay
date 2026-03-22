const SSR_FALLBACK = { width: 1440, height: 900 };

export function getViewport() {
  return typeof window === 'undefined'
    ? SSR_FALLBACK
    : { width: window.innerWidth, height: window.innerHeight };
}
