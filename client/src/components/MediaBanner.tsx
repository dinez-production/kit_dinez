import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { MediaBanner as MediaBannerType } from "@shared/schema";

// Cache configuration
const CACHE_CONFIG = {
  BANNER_CACHE_KEY: 'media_banners_cache',
  CACHE_DURATION: 1000 * 60 * 30, // 30 minutes
  IMAGE_CACHE_DURATION: 1000 * 60 * 60 * 24, // 24 hours
  STALE_TIME: 1000 * 60 * 15, // 15 minutes
};

// Cache utilities
const CacheUtils = {
  // Get cached banner data
  getCachedBanners: (): { data: MediaBannerType[], timestamp: number } | null => {
    try {
      const cached = localStorage.getItem(CACHE_CONFIG.BANNER_CACHE_KEY);
      if (!cached) return null;
      
      const parsedCache = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is still valid
      if (now - parsedCache.timestamp > CACHE_CONFIG.CACHE_DURATION) {
        localStorage.removeItem(CACHE_CONFIG.BANNER_CACHE_KEY);
        return null;
      }
      
      return parsedCache;
    } catch (error) {
      console.warn('Failed to get cached banners:', error);
      return null;
    }
  },

  // Cache banner data
  cacheBanners: (banners: MediaBannerType[]) => {
    try {
      const cacheData = {
        data: banners,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_CONFIG.BANNER_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to cache banners:', error);
    }
  },

  // Preload images
  preloadImages: (banners: MediaBannerType[]) => {
    banners.forEach((banner) => {
      if (banner.type !== 'video') {
        const img = new Image();
        img.src = `/api/media-banners/${banner.fileId}/file`;
        // Store in memory for immediate access
        img.onload = () => {
          console.log(`Preloaded banner image: ${banner.id}`);
        };
      }
    });
  },

  // Clear expired cache
  clearExpiredCache: () => {
    const cached = CacheUtils.getCachedBanners();
    if (!cached) {
      localStorage.removeItem(CACHE_CONFIG.BANNER_CACHE_KEY);
    }
  }
};

export default function MediaBanner() {
  const [currentIndex, setCurrentIndex] = useState(1); // Start at 1 (first real image)
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState<Record<string, boolean>>({});
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const queryClient = useQueryClient();

  // Clear expired cache on component mount
  useEffect(() => {
    CacheUtils.clearExpiredCache();
  }, []);

  // Enhanced fetch with caching
  const { data, isLoading } = useQuery<MediaBannerType[]>({
    queryKey: ['/api/media-banners'],
    queryFn: async () => {
      // First, try to get from cache
      const cachedData = CacheUtils.getCachedBanners();
      if (cachedData) {
        console.log('Using cached banner data');
        setIsUsingCache(true);
        // Preload images for cached data
        CacheUtils.preloadImages(cachedData.data);
        return cachedData.data;
      }

      // If no cache, fetch from server
      console.log('Fetching fresh banner data from server');
      setIsUsingCache(false);
      
      const response = await fetch('/api/media-banners', {
        headers: {
          'Cache-Control': 'max-age=1800', // 30 minutes browser cache
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch media banners');
      }
      
      const data = await response.json();
      
      // Cache the fresh data
      CacheUtils.cacheBanners(data);
      
      // Preload images
      CacheUtils.preloadImages(data);
      
      return data;
    },
    staleTime: CACHE_CONFIG.STALE_TIME, // 15 minutes
    gcTime: CACHE_CONFIG.CACHE_DURATION, // 30 minutes (React Query v5)
    refetchOnMount: false, // Don't refetch on mount, use cache
    refetchOnWindowFocus: false, // Don't refetch on focus
    refetchInterval: 1000 * 60 * 10, // Refetch every 10 minutes in background
  });

  // Ensure type safety for banners array
  const banners: MediaBannerType[] = data || [];

  // Set up SSE connection for real-time banner updates
  useEffect(() => {
    const eventSource = new EventSource('/api/sse');
    
    const handleBannerUpdate = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'banner_updated') {
          queryClient.invalidateQueries({ queryKey: ['/api/media-banners'] });
          // Clear local cache when server updates
          localStorage.removeItem(CACHE_CONFIG.BANNER_CACHE_KEY);
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.addEventListener('message', handleBannerUpdate);
    
    eventSource.onerror = (error) => {
      console.warn('SSE connection error:', error);
    };

    return () => {
      eventSource.removeEventListener('message', handleBannerUpdate);
      eventSource.close();
    };
  }, [queryClient]);

  // Handle image loading
  const handleImageLoad = (bannerId: string, index: number) => {
    console.log(`MediaBanner: Image ${index + 1} loaded successfully:`, bannerId);
    setImagesLoaded(prev => ({ ...prev, [bannerId]: true }));
  };

  const handleImageError = (bannerId: string, index: number) => {
    console.error(`MediaBanner: Image ${index + 1} failed to load:`, bannerId);
    setImagesLoaded(prev => ({ ...prev, [bannerId]: false }));
  };

  // Touch/mouse event handlers for swipe gestures
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (isTransitioning) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    startXRef.current = clientX;
    setIsDragging(true);
    
    // Clear auto-slide when user starts interacting
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging || isTransitioning) return;
    e.preventDefault();
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const diff = clientX - startXRef.current;
    setDragOffset(diff);
  };

  const handleTouchEnd = () => {
    if (!isDragging || isTransitioning) return;
    
    setIsDragging(false);
    const threshold = 80; // Minimum swipe distance
    
    if (Math.abs(dragOffset) > threshold) {
      setIsTransitioning(true);
      
      // Calculate the target index based on swipe direction
      let targetIndex = currentIndex;
      if (dragOffset > 0) {
        // Swipe right - go to previous
        targetIndex = currentIndex - 1;
      } else if (dragOffset < 0) {
        // Swipe left - go to next
        targetIndex = currentIndex + 1;
      }
      
      // Set the target index (this will show the smooth animation)
      setCurrentIndex(targetIndex);
      
      // After animation completes, handle boundary cases
      setTimeout(() => {
        setCurrentIndex((prevIndex) => {
          // Handle infinite loop boundaries
          if (prevIndex === 0) {
            // Went before first real image, jump to last real image
            return banners.length;
          } else if (prevIndex === banners.length + 1) {
            // Went past last real image, jump to first real image
            return 1;
          }
          return prevIndex;
        });
        
        setIsTransitioning(false);
        setDragOffset(0);
      }, 300);
    } else {
      // Snap back to current position
      setDragOffset(0);
    }
  };

  // Auto-slide functionality
  useEffect(() => {
    if (banners.length <= 1 || isDragging) return;

    intervalRef.current = setInterval(() => {
      if (!isTransitioning && !isDragging) {
        setIsTransitioning(true);
        setCurrentIndex((prevIndex) => prevIndex + 1);
        
        setTimeout(() => {
          setIsTransitioning(false);
          
          // Handle infinite loop for auto-slide
          setCurrentIndex((prevIndex) => {
            if (prevIndex === banners.length + 1) {
              return 1; // Jump back to first real image
            }
            return prevIndex;
          });
        }, 300);
      }
    }, 4000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [banners.length, currentIndex, isTransitioning, isDragging]);

  // Reset when banners change
  useEffect(() => {
    setCurrentIndex(1); // Start at first real image
    setIsTransitioning(false);
    setImagesLoaded({});
    setDragOffset(0);
    setIsDragging(false);
  }, [banners.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Show loading state instead of null
  if (isLoading) {
    return (
      <div className="w-full py-6" data-testid="media-banner-container">
        <div className="relative w-full h-64 overflow-hidden mx-auto max-w-sm">
          <div className="flex items-center justify-center h-full bg-gray-100 rounded-2xl">
            <div className="w-10 h-10 border-3 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  // Don't render if no banners
  if (banners.length === 0) {
    return null;
  }

  // Create extended array with cloned elements for infinite scroll
  const extendedBanners = banners.length > 0 ? [
    banners[banners.length - 1], // Clone of last image at start
    ...banners,                  // All real images
    banners[0]                   // Clone of first image at end
  ] : [];

  const totalSlides = extendedBanners.length;

  return (
    <div className="w-full" data-testid="media-banner-container">
      {/* Full width carousel */}
      <div className="relative w-full h-64 overflow-hidden">
        <div 
          ref={containerRef}
          className="relative w-full h-full cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseMove={handleTouchMove}
          onMouseUp={handleTouchEnd}
          onMouseLeave={handleTouchEnd}
        >
          {/* Card slides container */}
          <div 
            className="flex h-full transition-transform duration-300 ease-out"
            style={{
              transform: `translateX(-${currentIndex * (100 / totalSlides)}%)`,
              width: `${totalSlides * 100}%`
            }}
          >
            {extendedBanners.map((banner, index) => {
              // Create unique keys for cloned elements
              let uniqueKey;
              if (index === 0) {
                uniqueKey = `clone-last-${banner.id}`;
              } else if (index === totalSlides - 1) {
                uniqueKey = `clone-first-${banner.id}`;
              } else {
                uniqueKey = `real-${banner.id}`;
              }
              
              return (
              <div
                key={uniqueKey}
                className="w-full h-full flex-shrink-0"
                style={{ width: `${100 / totalSlides}%` }}
                data-testid={`banner-card-${index}`}
              >
                {/* Full width card */}
                <div className="w-full h-full rounded-2xl overflow-hidden shadow-lg">
                  {/* Card Content */}
                  {banner.type === 'video' ? (
                    <video
                      className="w-full h-full object-cover rounded-2xl"
                      autoPlay
                      muted
                      loop
                      playsInline
                      data-testid={`video-${banner.id}`}
                      onLoadedData={() => handleImageLoad(banner.id, index)}
                      onError={() => handleImageError(banner.id, index)}
                    >
                      <source 
                        src={`/api/media-banners/${banner.fileId}/file`}
                        type={banner.mimeType}
                      />
                    </video>
                  ) : (
                    <img
                      src={`/api/media-banners/${banner.fileId}/file`}
                      alt={banner.originalName}
                      className="w-full h-full object-cover rounded-2xl"
                      data-testid={`image-${banner.id}`}
                      onLoad={() => handleImageLoad(banner.id, index)}
                      onError={() => handleImageError(banner.id, index)}
                    />
                  )}
                  
                  
                  {/* Error State */}
                  {imagesLoaded[banner.id] === false && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl text-gray-500">
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-2 bg-gray-300 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium">Content unavailable</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              );
            })}
          </div>
          
          {/* Card Indicators */}
          {banners.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
              {banners.map((_, index) => {
                // Calculate real current index (subtract 1 for the cloned element at start)
                const realCurrentIndex = currentIndex - 1;
                const isActive = index === realCurrentIndex;
                
                return (
                <button
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    isActive
                      ? 'bg-white scale-125 shadow-lg' 
                      : 'bg-white/60 hover:bg-white/80'
                  }`}
                  onClick={() => {
                    if (!isTransitioning && !isDragging) {
                      setIsTransitioning(true);
                      setCurrentIndex(index + 1); // Add 1 for the cloned element at start
                      setTimeout(() => setIsTransitioning(false), 300);
                    }
                  }}
                  data-testid={`banner-indicator-${index}`}
                />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}