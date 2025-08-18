import { ReactNode } from 'react';
import { Loader2, RotateCcw, ChevronDown, Sparkles } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  resistance?: number;
  enabled?: boolean;
  className?: string;
}

export const PullToRefresh = ({
  children,
  onRefresh,
  threshold = 80,
  resistance = 2.5,
  enabled = true,
  className
}: PullToRefreshProps) => {
  const {
    containerRef,
    isRefreshing,
    pullDistance,
    shouldShowIndicator,
    isTriggered
  } = usePullToRefresh({
    onRefresh,
    threshold,
    resistance,
    enabled
  });

  // Calculate enhanced animation values for smooth, premium experience
  const indicatorOpacity = Math.min(pullDistance / threshold, 1);
  const indicatorScale = Math.min(0.5 + (pullDistance / threshold) * 0.5, 1);
  const pullProgress = Math.min(pullDistance / threshold, 1);
  
  // Enhanced animation calculations
  const bounceScale = isTriggered ? 1.1 : indicatorScale;
  const rotateAngle = pullProgress * 180;
  const pulseIntensity = Math.sin(pullProgress * Math.PI) * 0.3;
  const springOffset = Math.sin(pullProgress * Math.PI * 2) * 5;
  
  // Color transitions based on progress
  const progressColor = pullProgress < 0.5 
    ? `rgb(${Math.round(156 + pullProgress * 100)}, ${Math.round(163 + pullProgress * 50)}, ${Math.round(175 + pullProgress * 40)})` // gray to blue
    : `rgb(${Math.round(34 + (pullProgress - 0.5) * 40)}, ${Math.round(197 + (pullProgress - 0.5) * 50)}, ${Math.round(94 + (pullProgress - 0.5) * 60)})`; // blue to green

  console.log('PullToRefresh render: enabled=', enabled, 'isRefreshing=', isRefreshing, 'pullDistance=', pullDistance);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={containerRef}
        className="relative"
        style={{
          // Enhanced transform with spring-like effect
          transform: enabled && pullDistance > 0 
            ? `translateY(${Math.min(pullDistance * 0.3 + springOffset, threshold * 0.3)}px) scale(${1 + pulseIntensity * 0.02})` 
            : 'none',
          transition: isRefreshing || pullDistance === 0 
            ? 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' // Spring-like bounce back
            : 'none',
          filter: pullDistance > 0 ? `brightness(${1 + pulseIntensity * 0.1})` : 'none'
        }}
      >
      {/* Enhanced pull-to-refresh indicator */}
      {(shouldShowIndicator || isRefreshing) && (
        <div
          className="absolute top-0 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ease-out"
          style={{
            transform: `translate(-50%, ${-80 + Math.min(pullDistance * 0.4, 50)}px) scale(${bounceScale})`,
            opacity: isRefreshing ? 1 : indicatorOpacity,
          }}
        >
          {/* Outer glow ring */}
          <div 
            className="absolute inset-0 rounded-full animate-pulse"
            style={{
              background: `radial-gradient(circle, ${progressColor}20 0%, transparent 70%)`,
              transform: `scale(${1 + pullProgress * 0.5})`,
              opacity: pullProgress * 0.6
            }}
          />
          
          {/* Main indicator container */}
          <div 
            className={`relative bg-white/95 backdrop-blur-sm border-2 rounded-full p-4 shadow-xl transition-all duration-300 ${
              isTriggered ? 'pull-to-refresh-bounce' : ''
            } ${
              isRefreshing ? 'pull-to-refresh-glow' : ''
            }`}
            style={{
              borderColor: progressColor,
              boxShadow: `0 0 20px ${progressColor}40, 0 4px 20px rgba(0,0,0,0.15)`,
              background: `linear-gradient(135deg, white 0%, ${progressColor}08 100%)`
            }}
          >
            {/* Shimmer overlay during refresh */}
            {isRefreshing && (
              <div className="absolute inset-0 rounded-full pull-shimmer opacity-30" />
            )}
            {isRefreshing ? (
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Loader2 
                    className="w-6 h-6 animate-spin transition-colors duration-300" 
                    style={{ color: progressColor }}
                  />
                  <Sparkles 
                    className="absolute top-0 left-0 w-6 h-6 animate-pulse opacity-50" 
                    style={{ color: progressColor }}
                  />
                </div>
                <span className="text-sm font-semibold whitespace-nowrap transition-colors duration-300" style={{ color: progressColor }}>
                  Refreshing...
                </span>
              </div>
            ) : isTriggered ? (
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <RotateCcw 
                    className="w-6 h-6 transition-all duration-300 animate-bounce" 
                    style={{ 
                      color: progressColor,
                      transform: `rotate(${rotateAngle}deg) scale(1.1)` 
                    }}
                  />
                  <div 
                    className="absolute -inset-1 rounded-full animate-ping opacity-30"
                    style={{ backgroundColor: progressColor }}
                  />
                </div>
                <span className="text-sm font-semibold whitespace-nowrap transition-colors duration-300" style={{ color: progressColor }}>
                  Release to refresh
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <ChevronDown 
                    className="w-6 h-6 transition-all duration-300"
                    style={{
                      color: progressColor,
                      transform: `rotate(${rotateAngle}deg) scale(${1 + pullProgress * 0.2})`
                    }}
                  />
                  {pullProgress > 0.3 && (
                    <div 
                      className="absolute -inset-2 rounded-full opacity-20 animate-pulse"
                      style={{ backgroundColor: progressColor }}
                    />
                  )}
                </div>
                <span 
                  className="text-sm font-medium whitespace-nowrap transition-all duration-300"
                  style={{ 
                    color: progressColor,
                    opacity: 0.7 + pullProgress * 0.3
                  }}
                >
                  Pull to refresh
                </span>
              </div>
            )}
          </div>
          
            {/* Progress ring */}
            {!isRefreshing && pullProgress > 0 && (
              <div className="absolute inset-0 rounded-full">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 32 32">
                  <circle
                    cx="16"
                    cy="16"
                    r="14"
                    fill="none"
                    strokeWidth="2"
                    stroke={`${progressColor}20`}
                  />
                  <circle
                    cx="16"
                    cy="16"
                    r="14"
                    fill="none"
                    strokeWidth="2"
                    stroke={progressColor}
                    strokeDasharray="87.96"
                    strokeDashoffset={87.96 * (1 - pullProgress)}
                    strokeLinecap="round"
                    className="transition-all duration-200"
                    style={{
                      filter: `drop-shadow(0 0 4px ${progressColor}40)`
                    }}
                  />
                </svg>
              </div>
            )}
        </div>
      )}

        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;