import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MediaBanner as MediaBannerType } from "@shared/schema";

export default function MediaBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [showControls, setShowControls] = useState(false);
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

  // Auto-slide for multiple images (every 5 seconds)
  useEffect(() => {
    if (banners.length <= 1 || !isAutoPlaying) return;

    const imageOnlyBanners = banners.filter(banner => banner.type === 'image');
    if (imageOnlyBanners.length <= 1) return;

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

  const currentBanner = banners[currentIndex];
  const hasMultipleBanners = banners.length > 1;
  const imageOnlyBanners = banners.filter(banner => banner.type === 'image');

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? banners.length - 1 : prevIndex - 1
    );
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className="relative w-full bg-background">
      <div className="relative overflow-hidden rounded-lg shadow-sm">
        {currentBanner.type === 'video' ? (
          // Single video display
          <div className="relative w-full">
            <video
              key={currentBanner.id}
              className="w-full h-48 sm:h-64 object-cover rounded-lg"
              autoPlay
              muted
              loop
              playsInline
              onMouseEnter={() => setIsAutoPlaying(false)}
              onMouseLeave={() => setIsAutoPlaying(true)}
            >
              <source 
                src={`/api/media-banners/${currentBanner.fileId}/file`}
                type={currentBanner.mimeType}
              />
              Your browser does not support the video tag.
            </video>
          </div>
        ) : (
          // Image display (single or carousel)
          <div 
            className="relative w-full"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
            onTouchStart={() => setShowControls(true)}
            onTouchEnd={() => setTimeout(() => setShowControls(false), 3000)} // Hide after 3s on mobile
          >
            <img
              key={currentBanner.id}
              src={`/api/media-banners/${currentBanner.fileId}/file`}
              alt={currentBanner.originalName}
              className="w-full h-48 sm:h-64 object-cover rounded-lg"
              onError={(e) => {
                console.error('Failed to load banner image:', currentBanner.id);
                // Optionally hide broken images
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />

            {/* Navigation arrows for multiple images - only show on hover/touch */}
            {hasMultipleBanners && imageOnlyBanners.length > 1 && showControls && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 rounded-full w-8 h-8 p-0 transition-opacity duration-200"
                  onClick={prevSlide}
                  aria-label="Previous banner"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 rounded-full w-8 h-8 p-0 transition-opacity duration-200"
                  onClick={nextSlide}
                  aria-label="Next banner"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            )}

            {/* Dots indicator for multiple images - only show on hover/touch */}
            {hasMultipleBanners && imageOnlyBanners.length > 1 && showControls && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-2 transition-opacity duration-200">
                {banners.map((_, index) => (
                  <button
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentIndex
                        ? 'bg-white'
                        : 'bg-white/50'
                    }`}
                    onClick={() => goToSlide(index)}
                    aria-label={`Go to banner ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Media info overlay (optional, for debugging) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
          {currentBanner.type} {currentIndex + 1}/{banners.length}
        </div>
      )}
    </div>
  );
}