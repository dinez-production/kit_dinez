import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { MediaBanner as MediaBannerType } from "@shared/schema";

export default function MediaBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState<Record<string, boolean>>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
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

  // Start auto-slide only when we have banners and they're loaded
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Don't start sliding if no banners or only one banner
    if (banners.length <= 1) return;

    // Check if at least the current image is loaded
    const currentBanner = banners[currentIndex];
    if (!currentBanner || !imagesLoaded[currentBanner.id]) {
      return;
    }

    // Start the sliding interval
    intervalRef.current = setInterval(() => {
      if (!isTransitioning) {
        setIsTransitioning(true);
        setCurrentIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % banners.length;
          console.log(`MediaBanner: Sliding from ${prevIndex + 1} to ${nextIndex + 1}`);
          return nextIndex;
        });
        
        // Reset transition flag after animation completes
        setTimeout(() => {
          setIsTransitioning(false);
        }, 800); // Match transition duration
      }
    }, 5000); // 5 seconds between slides

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [banners.length, currentIndex, isTransitioning, imagesLoaded]);

  // Reset everything when banners change
  useEffect(() => {
    setCurrentIndex(0);
    setIsTransitioning(false);
    setImagesLoaded({});
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
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
    <div className="w-full py-4" data-testid="media-banner-container">
      <div className="relative w-full h-48 overflow-hidden">
        {/* Banner slides */}
        <div 
          className="flex h-full transition-transform duration-700 ease-in-out"
          style={{ 
            transform: `translateX(-${currentIndex * (100 / banners.length)}%)`,
            width: `${banners.length * 100}%`
          }}
        >
          {banners.map((banner, index) => (
            <div 
              key={banner.id}
              className="h-full flex-shrink-0 px-4 flex items-center justify-center"
              style={{ width: `${100 / banners.length}%` }}
              data-testid={`banner-slide-${index}`}
            >
              <div className="w-full h-full bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                {banner.type === 'video' ? (
                  <video
                    className="w-full h-full object-cover"
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
                    className="w-full h-full object-cover"
                    data-testid={`image-${banner.id}`}
                    onLoad={() => handleImageLoad(banner.id, index)}
                    onError={() => handleImageError(banner.id, index)}
                    style={{ 
                      opacity: imagesLoaded[banner.id] === false ? 0.3 : 1,
                      transition: 'opacity 0.3s ease-in-out'
                    }}
                  />
                )}
                
                {/* Loading indicator for images that haven't loaded */}
                {!imagesLoaded[banner.id] && imagesLoaded[banner.id] !== false && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                  </div>
                )}
                
                {/* Error state for failed images */}
                {imagesLoaded[banner.id] === false && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500">
                    <span className="text-sm">Image unavailable</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Navigation dots */}
        {banners.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {banners.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'bg-white shadow-lg' 
                    : 'bg-white/60 hover:bg-white/80'
                }`}
                onClick={() => {
                  if (!isTransitioning) {
                    setIsTransitioning(true);
                    setCurrentIndex(index);
                    setTimeout(() => setIsTransitioning(false), 800);
                  }
                }}
                data-testid={`banner-dot-${index}`}
              />
            ))}
          </div>
        )}

        {/* Banner counter */}
        {banners.length > 1 && (
          <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-sm">
            {currentIndex + 1} / {banners.length}
          </div>
        )}
      </div>
    </div>
  );
}