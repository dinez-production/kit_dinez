import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { MediaBanner as MediaBannerType } from "@shared/schema";

export default function MediaBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const queryClient = useQueryClient();

  // Fetch active media banners
  const { data: banners = [], isLoading } = useQuery<MediaBannerType[]>({
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

  // Auto-slide animation (every 4 seconds)
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [banners.length]);

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

  return (
    <div className="w-full overflow-hidden" data-testid="media-banner-flow">
      <div 
        className="flex transition-transform duration-1000 ease-in-out"
        style={{ 
          transform: `translateX(-${currentIndex * 100}%)`,
          width: `${banners.length * 100}%`
        }}
      >
        {banners.map((banner, index) => (
          <div 
            key={banner.id}
            className="w-full flex-shrink-0"
            style={{ width: `${100 / banners.length}%` }}
            data-testid={`banner-${index}`}
          >
            {banner.type === 'video' ? (
              <video
                className="w-full h-auto object-cover"
                autoPlay
                muted
                loop
                playsInline
                data-testid={`video-${banner.id}`}
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
                className="w-full h-auto object-cover"
                data-testid={`image-${banner.id}`}
                onError={(e) => {
                  console.error('Failed to load banner image:', banner.id);
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}