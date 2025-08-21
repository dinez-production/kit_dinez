import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { MediaBanner as MediaBannerType } from "@shared/schema";

export default function MediaBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState<Record<string, boolean>>({});
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const queryClient = useQueryClient();

  // Fetch active media banners
  const { data: banners = [], isLoading } = useQuery<MediaBannerType[]>({
    queryKey: ['/api/media-banners'],
    queryFn: async () => {
      const response = await fetch('/api/media-banners');
      if (!response.ok) {
        throw new Error('Failed to fetch media banners');
      }
      const data = await response.json();
      console.log('MediaBanner: Fetched banners:', data.length, data);
      return data;
    },
    staleTime: 1000 * 30,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Set up SSE connection for real-time banner updates
  useEffect(() => {
    const eventSource = new EventSource('/api/sse');
    
    const handleBannerUpdate = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'banner_updated') {
          queryClient.invalidateQueries({ queryKey: ['/api/media-banners'] });
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
      
      if (dragOffset > 0 && currentIndex > 0) {
        // Swipe right - go to previous
        setCurrentIndex(currentIndex - 1);
      } else if (dragOffset < 0 && currentIndex < banners.length - 1) {
        // Swipe left - go to next
        setCurrentIndex(currentIndex + 1);
      }
      
      setTimeout(() => {
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
        setCurrentIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % banners.length;
          return nextIndex;
        });
        
        setTimeout(() => {
          setIsTransitioning(false);
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
    setCurrentIndex(0);
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

  // Don't render if no banners or still loading
  if (isLoading || banners.length === 0) {
    return null;
  }

  return (
    <div className="w-full py-6" data-testid="media-banner-container">
      {/* Properly contained carousel */}
      <div className="relative w-full h-64 overflow-hidden mx-auto max-w-sm">
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
              transform: `translateX(calc(-${currentIndex * 100}% + ${isDragging ? dragOffset : 0}px))`,
              width: `${banners.length * 100}%`
            }}
          >
            {banners.map((banner, index) => (
              <div
                key={banner.id}
                className="w-full h-full flex-shrink-0 flex items-center justify-center px-4"
                style={{ width: `${100 / banners.length}%` }}
                data-testid={`banner-card-${index}`}
              >
                {/* Floating Card */}
                <div className="w-full max-w-xs h-52 rounded-2xl shadow-2xl bg-gradient-to-br from-white to-gray-50 overflow-hidden transform hover:scale-105 transition-transform duration-200">
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
                  
                  {/* Loading State */}
                  {!imagesLoaded[banner.id] && imagesLoaded[banner.id] !== false && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl">
                      <div className="w-10 h-10 border-3 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                    </div>
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
            ))}
          </div>
        </div>
      </div>

      {/* Card Indicators */}
      {banners.length > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          {banners.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'bg-blue-500 scale-125 shadow-lg' 
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              onClick={() => {
                if (!isTransitioning && !isDragging) {
                  setIsTransitioning(true);
                  setCurrentIndex(index);
                  setTimeout(() => setIsTransitioning(false), 300);
                }
              }}
              data-testid={`banner-indicator-${index}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}