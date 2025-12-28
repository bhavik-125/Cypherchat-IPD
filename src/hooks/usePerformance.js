import { useEffect, useCallback, useRef } from 'react';

export const usePerformance = () => {
  const perfRef = useRef({
    marks: new Map(),
    measures: new Map(),
    resources: new PerformanceObserver(() => {}),
  });
  
  // Start performance mark
  const startMark = useCallback((name) => {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`${name}-start`);
      perfRef.current.marks.set(name, 'started');
    }
  }, []);
  
  // End performance mark and measure
  const endMark = useCallback((name) => {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`${name}-end`);
      perfRef.current.marks.set(name, 'ended');
      
      // Create measure
      performance.measure(name, `${name}-start`, `${name}-end`);
      
      // Get duration
      const entries = performance.getEntriesByName(name, 'measure');
      if (entries.length > 0) {
        perfRef.current.measures.set(name, entries[0].duration);
      }
      
      // Clear marks
      performance.clearMarks(`${name}-start`);
      performance.clearMarks(`${name}-end`);
      performance.clearMeasures(name);
    }
  }, []);
  
  // Track page load performance
  const trackPageLoad = useCallback(() => {
    if (typeof performance !== 'undefined') {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');
      
      const metrics = {
        dns: navigation?.domainLookupEnd - navigation?.domainLookupStart || 0,
        tcp: navigation?.connectEnd - navigation?.connectStart || 0,
        ssl: navigation?.secureConnectionStart > 0 
          ? navigation.connectEnd - navigation.secureConnectionStart 
          : 0,
        ttfb: navigation?.responseStart - navigation?.requestStart || 0,
        domLoad: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart || 0,
        pageLoad: navigation?.loadEventEnd - navigation?.loadEventStart || 0,
        fcp: paint?.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        lcp: 0, // Will be updated by LCP observer
        cls: 0, // Will be updated by CLS observer
        fid: 0, // Will be updated by FID observer
      };
      
      // Send to analytics
      logPerformance('page_load', metrics);
      
      return metrics;
    }
  }, []);
  
  // Track Core Web Vitals
  useEffect(() => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      // LCP (Largest Contentful Paint)
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        perfRef.current.measures.set('lcp', lastEntry.startTime);
        logPerformance('lcp', { value: lastEntry.startTime });
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      
      // CLS (Cumulative Layout Shift)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        perfRef.current.measures.set('cls', clsValue);
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
      
      // FID (First Input Delay)
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const firstEntry = entries[0];
        if (firstEntry) {
          perfRef.current.measures.set('fid', firstEntry.processingStart - firstEntry.startTime);
          logPerformance('fid', { value: firstEntry.processingStart - firstEntry.startTime });
        }
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
      
      // Resource timing
      const resourceObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach(entry => {
          if (entry.initiatorType === 'fetch' || entry.initiatorType === 'xmlhttprequest') {
            logPerformance('resource_load', {
              name: entry.name,
              duration: entry.duration,
              size: entry.transferSize,
              type: entry.initiatorType,
            });
          }
        });
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      
      return () => {
        lcpObserver.disconnect();
        clsObserver.disconnect();
        fidObserver.disconnect();
        resourceObserver.disconnect();
      };
    }
  }, []);
  
  // Track React component render performance
  const trackComponentRender = useCallback((componentName, duration) => {
    logPerformance('component_render', {
      component: componentName,
      duration,
      timestamp: Date.now(),
    });
  }, []);
  
  // Track network requests
  const trackNetworkRequest = useCallback(async (url, method, startTime) => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    logPerformance('network_request', {
      url,
      method,
      duration,
      timestamp: Date.now(),
    });
    
    return duration;
  }, []);
  
  // Track user interactions
  const trackInteraction = useCallback((interactionType, target, duration = 0) => {
    logPerformance('user_interaction', {
      type: interactionType,
      target,
      duration,
      timestamp: Date.now(),
    });
  }, []);
  
  // Track memory usage (if supported)
  const trackMemory = useCallback(() => {
    if ('memory' in performance) {
      const memory = performance.memory;
      logPerformance('memory_usage', {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      });
    }
  }, []);
  
  // Log performance data (implement your analytics integration)
  const logPerformance = useCallback((metric, data) => {
    // Send to your analytics service (Google Analytics, custom backend, etc.)
    console.log(`[Performance] ${metric}:`, data);
    
    // Example: Send to Google Analytics
    if (window.gtag && process.env.REACT_APP_GA_TRACKING_ID) {
      window.gtag('event', 'performance', {
        event_category: metric,
        event_label: JSON.stringify(data),
        value: data.duration || data.value || 0,
        non_interaction: true,
      });
    }
  }, []);
  
  // Get performance report
  const getPerformanceReport = useCallback(() => {
    return {
      marks: Object.fromEntries(perfRef.current.marks),
      measures: Object.fromEntries(perfRef.current.measures),
      memory: 'memory' in performance ? performance.memory : null,
      navigation: performance.getEntriesByType('navigation')[0] || null,
      resources: performance.getEntriesByType('resource') || [],
    };
  }, []);
  
  return {
    startMark,
    endMark,
    trackPageLoad,
    trackComponentRender,
    trackNetworkRequest,
    trackInteraction,
    trackMemory,
    getPerformanceReport,
  };
};