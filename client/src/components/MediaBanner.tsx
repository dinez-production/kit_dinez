import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { MediaBanner as MediaBannerType } from "@shared/schema";

export default function MediaBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const queryClient = useQueryClient();

  // Fetch active media banners (user-facing, only active banners)
  const { data: banners = [], isLoading, error } = useQuery<MediaBannerType[]>({
    queryKey: ['/api/media-banners'],
    queryFn: async () => {
      const response = await fetch('/api/media-banners');
      if (!response.ok) {
        throw new Error('Failed to fetch media banners');
      }
      return await response.json();
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
          console.log('Banner updated, refreshing display...');
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

  // Auto-slide for multiple items (every 5 seconds)
  useEffect(() => {
    if (banners.length <= 1 || !isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [banners.length, isAutoPlaying]);

  // Reset currentIndex when banners change
  useEffect(() => {
    if (currentIndex >= banners.length) {
      setCurrentIndex(0);
    }
  }, [banners.length, currentIndex]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="w-full h-48 bg-gray-100 rounded-lg animate-pulse mx-4 my-4 flex items-center justify-center">
        <div className="text-gray-500">Loading banners...</div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="w-full h-48 bg-red-50 rounded-lg mx-4 my-4 flex items-center justify-center">
        <div className="text-red-500">Failed to load banners</div>
      </div>
    );
  }

  // Don't render if no banners
  if (banners.length === 0) {
    return null;
  }

  const hasMultipleBanners = banners.length > 1;

  return (
    <div className="w-full px-4 py-4" data-testid="media-banner-container">
      {/* Banner carousel container */}
      <div className="relative w-full h-48 bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Slide container */}
        <div 
          className="flex h-full transition-transform duration-500 ease-in-out"
          style={{ 
            transform: `translateX(-${currentIndex * 100}%)`,
            width: `${banners.length * 100}%`
          }}
          onMouseEnter={() => setIsAutoPlaying(false)}
          onMouseLeave={() => setIsAutoPlaying(true)}
        >
          {banners.map((banner, index) => (
            <div 
              key={banner.id}
              className="w-full h-full flex-shrink-0 relative"
              style={{ width: `${100 / banners.length}%` }}
              data-testid={`banner-slide-${index}`}
            >
              {/* Banner content */}
              <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                {banner.type === 'video' ? (
                  <video
                    className="max-w-full max-h-full object-contain rounded-lg"
                    autoPlay
                    muted
                    loop
                    playsInline
                    data-testid={`video-banner-${banner.id}`}
                  >
                    <source 
                      src={`/api/media-banners/${banner.fileId}/file`}
                      type={banner.mimeType}
                    />
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <img
                    src={`/api/media-banners/${banner.fileId}/file`}
                    alt={banner.originalName}
                    className="max-w-full max-h-full object-contain rounded-lg"
                    data-testid={`image-banner-${banner.id}`}
                    onError={(e) => {
                      console.error('Failed to load banner image:', banner.id);
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      // Show fallback
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <div class="w-full h-full flex items-center justify-center text-gray-500 bg-gray-200 rounded-lg">
                            <span>Image failed to load</span>
                          </div>
                        `;
                      }
                    }}
                    onLoad={() => {
                      console.log('Banner image loaded successfully:', banner.id);
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Navigation dots for multiple banners */}
        {hasMultipleBanners && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {banners.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  index === currentIndex ? 'bg-white' : 'bg-white/50'
                }`}
                onClick={() => setCurrentIndex(index)}
                data-testid={`banner-dot-${index}`}
              />
            ))}
          </div>
        )}

        {/* Navigation arrows for multiple banners */}
        {hasMultipleBanners && (
          <>
            <button
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 transition-colors duration-300"
              onClick={() => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)}
              data-testid="banner-prev-button"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 transition-colors duration-300"
              onClick={() => setCurrentIndex((prev) => (prev + 1) % banners.length)}
              data-testid="banner-next-button"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Banner count indicator */}
      {banners.length > 0 && (
        <div className="text-center mt-2 text-sm text-gray-500">
          {hasMultipleBanners ? `${currentIndex + 1} of ${banners.length}` : '1 banner'}
        </div>
      )}
    </div>
  );
}