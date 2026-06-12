// ─── Responsive Breakpoint Hook ──────────────────────────────────
// Provides 'mobile' | 'tablet' | 'desktop' breakpoint detection.
// mobile:  < 768px
// tablet:  768px – 1023px
// desktop: ≥ 1024px

import { useState, useEffect } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
} as const;

function getBreakpoint(width: number): Breakpoint {
  if (width < BREAKPOINTS.tablet) return 'mobile';
  if (width < BREAKPOINTS.desktop) return 'tablet';
  return 'desktop';
}

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');

  useEffect(() => {
    const update = () => setBreakpoint(getBreakpoint(window.innerWidth));
    update();

    const mql = window.matchMedia('(min-width: 768px)');
    const mqlDesktop = window.matchMedia('(min-width: 1024px)');

    const onChange = () => update();
    mql.addEventListener('change', onChange);
    mqlDesktop.addEventListener('change', onChange);

    return () => {
      mql.removeEventListener('change', onChange);
      mqlDesktop.removeEventListener('change', onChange);
    };
  }, []);

  return breakpoint;
}

/** Convenience booleans */
export function useResponsive() {
  const bp = useBreakpoint();
  return {
    breakpoint: bp,
    isMobile: bp === 'mobile',
    isTablet: bp === 'tablet',
    isDesktop: bp === 'desktop',
    isMobileOrTablet: bp === 'mobile' || bp === 'tablet',
  };
}
