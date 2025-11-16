'use client';

import { useState, useEffect } from 'react';

/**
 * Hook for responsive breakpoint detection
 * @param {Object} breakpoints - Custom breakpoints (optional)
 * @returns {Object} Current breakpoint states
 */
export function useResponsive(breakpoints = {
  mobile: 640,
  tablet: 1024,
  desktop: 1280
}) {
  const [windowSize, setWindowSize] = useState({
    width: undefined,
    height: undefined
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowSize.width < breakpoints.mobile;
  const isTablet = windowSize.width >= breakpoints.mobile && windowSize.width < breakpoints.tablet;
  const isDesktop = windowSize.width >= breakpoints.desktop;
  const isTabletOrMobile = windowSize.width < breakpoints.tablet;

  return {
    isMobile,
    isTablet,
    isDesktop,
    isTabletOrMobile,
    width: windowSize.width,
    height: windowSize.height
  };
}

