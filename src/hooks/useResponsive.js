import { useState, useEffect, useMemo } from 'react';
import { throttle } from 'lodash';

export const useResponsive = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });
  
  const [deviceType, setDeviceType] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isLargeDesktop: false,
    isLandscape: false,
    isPortrait: false,
  });
  
  const [touchDevice, setTouchDevice] = useState(false);
  
  // Breakpoints following Tailwind/TailwindCSS standards
  const BREAKPOINTS = {
    xs: 375,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  };
  
  // Device type detection
  const detectDevice = (width) => ({
    isMobile: width < BREAKPOINTS.md,
    isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isDesktop: width >= BREAKPOINTS.lg && width < BREAKPOINTS['2xl'],
    isLargeDesktop: width >= BREAKPOINTS['2xl'],
    isLandscape: width > windowSize.height,
    isPortrait: width <= windowSize.height,
  });
  
  // Touch detection
  const detectTouch = () => {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0)
    );
  };
  
  // Orientation detection
  const detectOrientation = () => {
    const { width, height } = windowSize;
    return {
      isLandscape: width > height,
      isPortrait: width <= height,
      orientation: width > height ? 'landscape' : 'portrait',
    };
  };
  
  // Viewport safe areas (for mobile notches)
  const getSafeArea = () => {
    if (typeof CSS !== 'undefined' && CSS.supports('padding-top: env(safe-area-inset-top)')) {
      return {
        top: getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top'),
        right: getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-right'),
        bottom: getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom'),
        left: getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-left'),
      };
    }
    return { top: '0px', right: '0px', bottom: '0px', left: '0px' };
  };
  
  // Window resize handler
  useEffect(() => {
    const handleResize = throttle(() => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }, 100);
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Update device type on resize
  useEffect(() => {
    setDeviceType(detectDevice(windowSize.width));
    setTouchDevice(detectTouch());
  }, [windowSize]);
  
  // CSS Media Query support
  const useMediaQuery = (query) => {
    const [matches, setMatches] = useState(false);
    
    useEffect(() => {
      const media = window.matchMedia(query);
      
      if (media.matches !== matches) {
        setMatches(media.matches);
      }
      
      const listener = (e) => setMatches(e.matches);
      media.addEventListener('change', listener);
      
      return () => media.removeEventListener('change', listener);
    }, [matches, query]);
    
    return matches;
  };
  
  // Common media queries
  const mediaQueries = {
    isXs: useMediaQuery(`(max-width: ${BREAKPOINTS.xs}px)`),
    isSm: useMediaQuery(`(max-width: ${BREAKPOINTS.sm}px)`),
    isMd: useMediaQuery(`(max-width: ${BREAKPOINTS.md}px)`),
    isLg: useMediaQuery(`(max-width: ${BREAKPOINTS.lg}px)`),
    isXl: useMediaQuery(`(max-width: ${BREAKPOINTS.xl}px)`),
    is2xl: useMediaQuery(`(max-width: ${BREAKPOINTS['2xl']}px)`),
    prefersReducedMotion: useMediaQuery('(prefers-reduced-motion: reduce)'),
    prefersDarkMode: useMediaQuery('(prefers-color-scheme: dark)'),
    hoverSupported: useMediaQuery('(hover: hover)'),
  };
  
  // Current breakpoint
  const currentBreakpoint = useMemo(() => {
    const { width } = windowSize;
    
    if (width < BREAKPOINTS.xs) return 'xs';
    if (width < BREAKPOINTS.sm) return 'sm';
    if (width < BREAKPOINTS.md) return 'md';
    if (width < BREAKPOINTS.lg) return 'lg';
    if (width < BREAKPOINTS.xl) return 'xl';
    if (width < BREAKPOINTS['2xl']) return '2xl';
    return '3xl';
  }, [windowSize]);
  
  // Responsive values generator
  const responsiveValue = (values) => {
    const breakpointOrder = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'];
    const currentIndex = breakpointOrder.indexOf(currentBreakpoint);
    
    // Find the closest defined value
    for (let i = currentIndex; i >= 0; i--) {
      if (values[breakpointOrder[i]] !== undefined) {
        return values[breakpointOrder[i]];
      }
    }
    
    // Fallback to default or first value
    return values.default || Object.values(values)[0];
  };
  
  // Safe area values
  const safeArea = useMemo(() => getSafeArea(), [windowSize]);
  
  return {
    // Window information
    windowSize,
    currentBreakpoint,
    
    // Device type
    ...deviceType,
    touchDevice,
    
    // Orientation
    ...detectOrientation(),
    
    // Media queries
    mediaQueries,
    
    // Utilities
    responsiveValue,
    safeArea,
    
    // Constants
    breakpoints: BREAKPOINTS,
    
    // Helper methods
    isBelow: (breakpoint) => windowSize.width < BREAKPOINTS[breakpoint],
    isAbove: (breakpoint) => windowSize.width >= BREAKPOINTS[breakpoint],
    between: (min, max) => 
      windowSize.width >= BREAKPOINTS[min] && windowSize.width < BREAKPOINTS[max],
  };
};

// Higher-order component for responsive props
export const withResponsive = (Component) => {
  return function WithResponsive(props) {
    const responsive = useResponsive();
    return <Component {...props} responsive={responsive} />;
  };
};