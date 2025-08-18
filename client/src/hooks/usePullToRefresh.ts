import { useState, useEffect, useCallback, useRef } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  resistance?: number;
  enabled?: boolean;
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
  enabled = true
}: UsePullToRefreshOptions) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [shouldShowIndicator, setShouldShowIndicator] = useState(false);
  const [isTriggered, setIsTriggered] = useState(false);
  
  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || isRefreshing) return;
    
    // Only start pull-to-refresh if we're at the top of the page
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    if (scrollTop > 0) return;
    
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = false;
    console.log('Pull-to-refresh: Touch start at', touchStartY.current);
  }, [enabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || isRefreshing) return;
    
    touchCurrentY.current = e.touches[0].clientY;
    const deltaY = touchCurrentY.current - touchStartY.current;
    
    // Only proceed if pulling down and at top of page
    if (deltaY <= 0) {
      setPullDistance(0);
      setShouldShowIndicator(false);
      return;
    }
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    if (scrollTop > 0) return;
    
    // Prevent default scrolling behavior when pulling down
    e.preventDefault();
    
    isDragging.current = true;
    console.log('Pull-to-refresh: Moving, delta=', deltaY, 'scrollTop=', scrollTop);
    
    // Apply enhanced resistance curve for more natural feel
    const resistedDistance = deltaY < threshold 
      ? deltaY / resistance 
      : threshold / resistance + Math.sqrt(deltaY - threshold) * 0.3;
    
    setPullDistance(resistedDistance);
    setShouldShowIndicator(resistedDistance > threshold * 0.3);
    
    // Update triggered state with smooth transition
    const shouldTrigger = resistedDistance >= threshold;
    if (shouldTrigger !== isTriggered) {
      setIsTriggered(shouldTrigger);
      console.log('Pull-to-refresh: Triggered state changed to', shouldTrigger);
    }
  }, [enabled, isRefreshing, threshold, resistance, isTriggered]);

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || isRefreshing || !isDragging.current) return;
    
    isDragging.current = false;
    
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setShouldShowIndicator(true);
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
        setShouldShowIndicator(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
      setShouldShowIndicator(false);
      setIsTriggered(false);
    }
  }, [enabled, isRefreshing, pullDistance, threshold, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    // Add passive: false to allow preventDefault
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, enabled]);

  return {
    containerRef,
    isRefreshing,
    pullDistance,
    shouldShowIndicator,
    isTriggered
  };
};