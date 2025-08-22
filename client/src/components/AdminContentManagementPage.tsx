import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  ArrowLeft, Image, Video, Plus, 
  Trash2, Eye, Upload, Search, X, Loader2, Play, Pause, CheckCircle, XCircle, Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthSync } from "@/hooks/useDataSync";
import type { MediaBanner } from "@shared/schema";

export default function AdminContentManagementPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuthSync();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Dialog states for media management
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MediaBanner | null>(null);
  
  // Multiple file upload state
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: { name: string; status: 'waiting' | 'uploading' | 'success' | 'error'; error?: string }
  }>({});
  const [isMultipleUpload, setIsMultipleUpload] = useState(false);

  // Set up SSE connection for real-time updates
  useEffect(() => {
    const eventSource = new EventSource('/api/sse');
    
    const handleUpdate = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'banner_updated') {
          // Invalidate both admin and user queries
          queryClient.invalidateQueries({ queryKey: ['/api/media-banners'] });
          console.log('Admin: Banner updated, refreshing data...');
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.addEventListener('message', handleUpdate);
    
    eventSource.onerror = (error) => {
      console.warn('Admin SSE connection error:', error);
    };

    return () => {
      eventSource.removeEventListener('message', handleUpdate);
      eventSource.close();
    };
  }, [queryClient]);

  // Fetch media banners (admin view - all banners)
  const { data: mediaData = [], isLoading: mediaLoading, refetch: refetchMedia } = useQuery<MediaBanner[]>({
    queryKey: ['/api/media-banners', 'admin'],
    queryFn: async () => {
      const response = await fetch('/api/media-banners?admin=true');
      if (!response.ok) {
        throw new Error('Failed to fetch media banners');
      }
      return response.json();
    },
    staleTime: 1000 * 30, // 30 seconds for real-time updates
    refetchOnMount: true,
  });

  // Upload media mutation
  const uploadMediaMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      if (user?.id) {
        formData.append('uploadedBy', user.id.toString());
      }

      const response = await fetch('/api/media-banners', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate both admin and user queries for comprehensive updates
      queryClient.invalidateQueries({ queryKey: ['/api/media-banners'] });
      toast({
        title: "Success",
        description: "Media file uploaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed", 
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete media mutation
  const deleteMediaMutation = useMutation({
    mutationFn: async (bannerId: string) => {
      const response = await fetch(`/api/media-banners/${bannerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Delete failed');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/media-banners'] });
      setDeleteDialogOpen(false);
      toast({
        title: "Success",
        description: "Media file deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle media status mutation
  const toggleMediaMutation = useMutation({
    mutationFn: async (bannerId: string) => {
      const response = await fetch(`/api/media-banners/${bannerId}/toggle`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Toggle failed');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/media-banners'] });
      toast({
        title: "Success",
        description: "Media status updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // File upload handlers
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    // Validate all files first
    const invalidFiles = fileArray.filter(file => 
      !file.type.startsWith('image/') && !file.type.startsWith('video/') ||
      file.size > 50 * 1024 * 1024
    );

    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid Files",
        description: `${invalidFiles.length} file(s) are invalid. Only images/videos under 50MB are allowed.`,
        variant: "destructive",
      });
      
      // Filter out invalid files and continue with valid ones
      const validFiles = fileArray.filter(file => 
        (file.type.startsWith('image/') || file.type.startsWith('video/')) &&
        file.size <= 50 * 1024 * 1024
      );
      
      if (validFiles.length === 0) {
        if (event.target) {
          event.target.value = '';
        }
        return;
      }
    }

    const validFiles = fileArray.filter(file => 
      (file.type.startsWith('image/') || file.type.startsWith('video/')) &&
      file.size <= 50 * 1024 * 1024
    );

    if (validFiles.length === 1) {
      // Single file upload - use existing logic
      uploadMediaMutation.mutate(validFiles[0]);
    } else {
      // Multiple file upload - handle sequentially
      await handleMultipleFileUpload(validFiles);
    }
    
    // Reset the input
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleMultipleFileUpload = async (files: File[]) => {
    setIsMultipleUpload(true);
    
    // Initialize progress state
    const initialProgress: typeof uploadProgress = {};
    files.forEach((file, index) => {
      initialProgress[`${index}-${file.name}`] = {
        name: file.name,
        status: 'waiting'
      };
    });
    setUploadProgress(initialProgress);

    let successCount = 0;
    let errorCount = 0;

    // Upload files sequentially
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileKey = `${i}-${file.name}`;
      
      // Update status to uploading
      setUploadProgress(prev => ({
        ...prev,
        [fileKey]: { ...prev[fileKey], status: 'uploading' }
      }));

      try {
        // Create FormData for this file
        const formData = new FormData();
        formData.append('file', file);
        if (user?.id) {
          formData.append('uploadedBy', user.id.toString());
        }

        const response = await fetch('/api/media-banners', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Upload failed');
        }

        // Update status to success
        setUploadProgress(prev => ({
          ...prev,
          [fileKey]: { ...prev[fileKey], status: 'success' }
        }));
        successCount++;
      } catch (error) {
        // Update status to error
        setUploadProgress(prev => ({
          ...prev,
          [fileKey]: { 
            ...prev[fileKey], 
            status: 'error',
            error: error instanceof Error ? error.message : 'Upload failed'
          }
        }));
        errorCount++;
      }
    }

    // Show final result
    if (successCount > 0) {
      queryClient.invalidateQueries({ queryKey: ['/api/media-banners'] });
    }
    
    toast({
      title: "Upload Complete",
      description: `${successCount} file(s) uploaded successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      variant: errorCount === files.length ? "destructive" : "default",
    });

    // Clear progress after a delay
    setTimeout(() => {
      setUploadProgress({});
      setIsMultipleUpload(false);
    }, 3000);
  };

  // Button handlers for media
  const handleView = (item: MediaBanner) => {
    setSelectedItem(item);
    setViewDialogOpen(true);
  };

  const handleDelete = (item: MediaBanner) => {
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedItem?.id) {
      deleteMediaMutation.mutate(selectedItem.id);
    }
  };

  const renderMedia = () => {
    const filteredMedia = mediaData.filter((item: MediaBanner) =>
      (item.originalName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (mediaLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading media files...</span>
        </div>
      );
    }

    if (filteredMedia.length === 0 && !searchTerm) {
      return (
        <div className="text-center py-12">
          <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">No media files uploaded yet</p>
          <p className="text-muted-foreground text-sm mt-2">Upload images and videos to display as banners</p>
          <Button 
            onClick={handleFileSelect}
            className="mt-4"
            disabled={uploadMediaMutation.isPending}
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploadMediaMutation.isPending ? 'Uploading...' : 'Upload Media'}
          </Button>
        </div>
      );
    }

    if (filteredMedia.length === 0 && searchTerm) {
      return (
        <div className="text-center py-8">
          <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No media files match your search</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {filteredMedia.map((item) => (
          <div key={item.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  {item.type === 'video' ? (
                    <Video className="h-4 w-4 text-primary" />
                  ) : (
                    <Image className="h-4 w-4 text-primary" />
                  )}
                  <h4 className="font-medium text-foreground">{item.originalName}</h4>
                  <Badge variant={item.isActive ? "default" : "secondary"}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <Badge variant="outline">
                    {item.type}
                  </Badge>
                </div>
                <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                  <span>Size: {Math.round(item.size / 1024)} KB</span>
                  <span>Type: {item.mimeType}</span>
                  {item.uploadedBy && <span>Uploaded by: User {item.uploadedBy}</span>}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleView(item)}
                  title="View Media"
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => toggleMediaMutation.mutate(item.id)}
                  disabled={toggleMediaMutation.isPending}
                  title={item.isActive ? "Deactivate" : "Activate"}
                >
                  {item.isActive ? (
                    <Pause className="h-3 w-3" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleDelete(item)}
                  title="Delete Media"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation("/admin")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Content Management</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Manage media banners displayed in the app
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            onClick={handleFileSelect}
            disabled={uploadMediaMutation.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploadMediaMutation.isPending ? 'Uploading...' : 'Upload Media'}
          </Button>
        </div>
      </div>

      {/* Multiple Upload Progress */}
      {isMultipleUpload && Object.keys(uploadProgress).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-4 w-4" />
              <span>Upload Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(uploadProgress).map(([key, progress]) => (
                <div key={key} className="flex items-center space-x-3 p-2 border rounded-lg">
                  <div className="flex-shrink-0">
                    {progress.status === 'waiting' && <Clock className="h-4 w-4 text-gray-400" />}
                    {progress.status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                    {progress.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {progress.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{progress.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {progress.status === 'waiting' && 'Waiting...'}
                      {progress.status === 'uploading' && 'Uploading...'}
                      {progress.status === 'success' && 'Completed'}
                      {progress.status === 'error' && `Failed: ${progress.error}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter Bar */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search media files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
              onClick={() => setSearchTerm("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Media Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Image className="h-5 w-5" />
            <span>Media Banners</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderMedia()}
        </CardContent>
      </Card>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,video/*"
        multiple
        className="hidden"
      />

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedItem?.originalName}
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="mt-4">
              {selectedItem.type === 'video' ? (
                <video
                  className="w-full max-h-96 rounded-lg"
                  controls
                  src={`/api/media-banners/${selectedItem.fileId}/file`}
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <img
                  src={`/api/media-banners/${selectedItem.fileId}/file`}
                  alt={selectedItem.originalName}
                  className="w-full max-h-96 object-contain rounded-lg"
                />
              )}
              <div className="mt-4 space-y-2 text-sm">
                <p><strong>Type:</strong> {selectedItem.mimeType}</p>
                <p><strong>Size:</strong> {Math.round(selectedItem.size / 1024)} KB</p>
                <p><strong>Status:</strong> {selectedItem.isActive ? 'Active' : 'Inactive'}</p>
                <p><strong>Display Order:</strong> {selectedItem.displayOrder}</p>
                {selectedItem.uploadedBy && <p><strong>Uploaded by:</strong> User {selectedItem.uploadedBy}</p>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Media File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedItem?.originalName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}