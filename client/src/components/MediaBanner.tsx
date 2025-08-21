
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { MediaBanner as MediaBannerType } from "@shared/schema";

export default function MediaBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const queryClient = useQueryClient();

  // Fetch active media banners (user-facing, only active banners)
  const { data: banners = [], isLoading } = useQuery<MediaBannerType[]>({
    queryKey: ['/api/media-banners'],
    queryFn: async () => {
      const response = await fetch('/api/media-banners');
      if (!response.ok) {
        throw new Error('Failed to fetch media banners');
      }
      return await response.json(); // Server now returns only active banners
    },
    staleTime: 1000 * 30, // 30 seconds for real-time updates
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
          // Invalidate and refetch banner data when updates occur
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

  // Don't render if no banners or still loading
  if (isLoading || banners.length === 0) {
    return null;
  }

  const hasMultipleBanners = banners.length > 1;

  return (
    <div className="animate-fade-in">
      <div className="relative w-full bg-background p-4">
        {/* Elevated container with soft shadow */}
        <div className="bg-white rounded-3xl shadow-lg shadow-gray-200/50 overflow-hidden">
          {/* Horizontal scrolling container */}
          <div className="relative overflow-hidden">
            <div 
              className="flex transition-transform duration-500 ease-in-out"
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
                  className="flex-shrink-0 w-full"
                  style={{ width: '100%' }}
                >
                  {/* Individual media card */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 mx-4">
                    {banner.type === 'video' ? (
                      <video
                        className="w-full aspect-[3/1] object-cover"
                        autoPlay
                        muted
                        loop
                        playsInline
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
                        className="w-full aspect-[3/1] object-contain"
                        onError={(e) => {
                          console.error('Failed to load banner image:', banner.id);
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Slide indicators */}
          {hasMultipleBanners && (
            <div className="flex justify-center space-x-2 py-4 bg-white">
              {banners.map((_, index) => (
                <button
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? 'bg-blue-500 scale-125'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  onClick={() => setCurrentIndex(index)}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
