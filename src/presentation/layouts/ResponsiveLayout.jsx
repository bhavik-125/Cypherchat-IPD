import React, { Suspense, lazy } from 'react';
import { useResponsive } from '../../hooks/useResponsive';
import { ErrorBoundary } from '../../components/shared/ErrorBoundary';
import { SuspenseLoader } from '../../components/shared/SuspenseLoader';
import './ResponsiveLayout.css';

// Lazy load layouts for code splitting
const DesktopLayout = lazy(() => import('./DesktopLayout'));
const MobileLayout = lazy(() => import('./MobileLayout'));
const TabletLayout = lazy(() => import('./TabletLayout'));

export const ResponsiveLayout = ({ children }) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  
  // Select layout based on device
  const LayoutComponent = React.useMemo(() => {
    if (isMobile) return MobileLayout;
    if (isTablet) return TabletLayout;
    return DesktopLayout;
  }, [isMobile, isTablet, isDesktop]);
  
  // Handle orientation changes
  React.useEffect(() => {
    const handleOrientationChange = () => {
      // Force re-render on orientation change
      window.dispatchEvent(new Event('resize'));
    };
    
    window.addEventListener('orientationchange', handleOrientationChange);
    return () => window.removeEventListener('orientationchange', handleOrientationChange);
  }, []);
  
  return (
    <ErrorBoundary>
      <Suspense fallback={<SuspenseLoader />}>
        <div className="responsive-layout">
          <LayoutComponent>
            {children}
          </LayoutComponent>
        </div>
      </Suspense>
    </ErrorBoundary>
  );
};

// Layout selector utility
export const useLayout = () => {
  const responsive = useResponsive();
  
  return {
    layout: responsive.isMobile ? 'mobile' : 
            responsive.isTablet ? 'tablet' : 'desktop',
    columns: responsive.isMobile ? 1 : 
             responsive.isTablet ? 2 : 3,
    spacing: responsive.isMobile ? 'compact' : 
             responsive.isTablet ? 'comfortable' : 'spacious',
    navigation: responsive.isMobile ? 'bottom' : 'sidebar',
  };
};