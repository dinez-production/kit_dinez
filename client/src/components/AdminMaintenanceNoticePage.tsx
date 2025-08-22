import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  ArrowLeft, Image, Video, Plus, Trash2, Eye, Upload, X, Loader2, 
  CheckCircle, XCircle, Clock, AlertTriangle, Settings, Play
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthSync } from "@/hooks/useDataSync";
import { apiRequest } from "@/lib/queryClient";
import type { MaintenanceNotice } from "@shared/schema";

export default function AdminMaintenanceNoticePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuthSync();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<MaintenanceNotice | null>(null);
  
  // Upload state
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: { name: string; status: 'waiting' | 'uploading' | 'success' | 'error'; error?: string }
  }>({});
  const [isUploading, setIsUploading] = useState(false);

  // Fetch maintenance notices
  const { data: notices = [], isLoading: noticesLoading, refetch } = useQuery<MaintenanceNotice[]>({
    queryKey: ['/api/maintenance-notices'],
    staleTime: 1000 * 30,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Set up SSE connection for real-time updates
  useEffect(() => {
    const eventSource = new EventSource('/api/sse');
    
    const handleUpdate = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'maintenance_notice_updated') {
          queryClient.invalidateQueries({ queryKey: ['/api/maintenance-notices'] });
          console.log('Admin: Maintenance notice updated, refreshing data...');
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
      eventSource.close();
    };
  }, [queryClient]);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: { file: File; title: string }) => {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('title', data.title);
      formData.append('uploadedBy', user?.id.toString() || '');

      return apiRequest('/api/maintenance-notices', {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: () => {
      setIsUploading(false);
      setUploadProgress({});
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance-notices'] });
      toast({
        title: "Success",
        description: "Maintenance notice uploaded successfully!",
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      setIsUploading(false);
      setUploadProgress({});
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload maintenance notice",
        variant: "destructive",
      });
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/maintenance-notices/${id}/toggle`, {
        method: 'PATCH',
      });
    },
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance-notices'] });
      const action = data.isActive ? 'activated' : 'deactivated';
      toast({
        title: "Status Updated",
        description: `Maintenance notice ${action} successfully!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update maintenance notice status",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/maintenance-notices/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance-notices'] });
      setDeleteDialogOpen(false);
      setSelectedNotice(null);
      toast({
        title: "Deleted",
        description: "Maintenance notice deleted successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete maintenance notice",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast({
        title: "Invalid File Type",
        description: "Only image and video files are allowed for maintenance notices",
        variant: "destructive",
      });
      return;
    }

    // Get title from user
    const title = prompt("Enter a title for this maintenance notice:");
    if (!title || title.trim() === '') {
      toast({
        title: "Title Required",
        description: "Please provide a title for the maintenance notice",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress({
      [file.name]: { name: file.name, status: 'uploading' }
    });

    uploadMutation.mutate({ file, title: title.trim() });
  };

  const handleToggleStatus = (notice: MaintenanceNotice) => {
    if (notice.isActive) {
      // Deactivating - no confirmation needed
      toggleStatusMutation.mutate(notice.id);
    } else {
      // Activating - confirm since it will deactivate others
      const confirmMessage = notices.some(n => n.isActive && n.id !== notice.id)
        ? "Activating this maintenance notice will deactivate all other active notices. Continue?"
        : "Activate this maintenance notice?";
        
      if (window.confirm(confirmMessage)) {
        toggleStatusMutation.mutate(notice.id);
      }
    }
  };

  const handleDelete = (notice: MaintenanceNotice) => {
    setSelectedNotice(notice);
    setDeleteDialogOpen(true);
  };

  const handleView = (notice: MaintenanceNotice) => {
    setSelectedNotice(notice);
    setViewDialogOpen(true);
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground";
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setLocation("/admin")}
            data-testid="button-back-admin"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Maintenance Notice Management</h1>
            <p className="text-sm text-muted-foreground">
              Upload and manage full-screen maintenance notices for users
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            size="sm"
            data-testid="button-upload-notice"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Upload Notice
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
            data-testid="input-file-upload"
          />
        </div>
      </div>

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.values(uploadProgress).map((progress) => (
                <div key={progress.name} className="flex items-center space-x-2">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{progress.name}</span>
                      <Badge variant={
                        progress.status === 'success' ? 'default' : 
                        progress.status === 'error' ? 'destructive' : 'secondary'
                      }>
                        {progress.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {noticesLoading ? (
          <Card className="col-span-full">
            <CardContent className="p-6 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p>Loading maintenance notices...</p>
            </CardContent>
          </Card>
        ) : notices.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-6 text-center">
              <Image className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Maintenance Notices</h3>
              <p className="text-muted-foreground mb-4">
                Upload your first maintenance notice to get started
              </p>
              <Button onClick={() => fileInputRef.current?.click()} data-testid="button-upload-first">
                <Plus className="w-4 h-4 mr-2" />
                Upload Notice
              </Button>
            </CardContent>
          </Card>
        ) : (
          notices.map((notice) => (
            <Card key={notice.id} className="overflow-hidden">
              <div className="aspect-video bg-muted relative">
                {notice.mediaType === 'video' ? (
                  <div className="relative w-full h-full">
                    <video
                      src={`/api/maintenance-notices/${notice.imageFileId}/file`}
                      className="w-full h-full object-cover"
                      muted
                      preload="metadata"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/50 rounded-full p-3">
                        <Video className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <img
                    src={`/api/maintenance-notices/${notice.imageFileId}/file`}
                    alt={notice.title}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="bg-black/70 text-white">
                    {notice.mediaType === 'video' ? (
                      <Video className="w-3 h-3 mr-1" />
                    ) : (
                      <Image className="w-3 h-3 mr-1" />
                    )}
                    {notice.mediaType}
                  </Badge>
                </div>
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center space-x-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleView(notice)}
                    data-testid={`button-view-${notice.id}`}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(notice)}
                    data-testid={`button-delete-${notice.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-sm truncate flex-1" title={notice.title}>
                    {notice.title}
                  </h3>
                  <Badge 
                    className={`ml-2 ${getStatusColor(notice.isActive)} flex items-center space-x-1`}
                    data-testid={`status-${notice.id}`}
                  >
                    {getStatusIcon(notice.isActive)}
                    <span>{notice.isActive ? 'Active' : 'Inactive'}</span>
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mb-3">
                  <p>Size: {(notice.size / 1024 / 1024).toFixed(2)} MB</p>
                  <p>Created: {new Date(notice.createdAt).toLocaleDateString()}</p>
                </div>
                <Button
                  size="sm"
                  variant={notice.isActive ? "outline" : "default"}
                  className="w-full"
                  onClick={() => handleToggleStatus(notice)}
                  disabled={toggleStatusMutation.isPending}
                  data-testid={`button-toggle-${notice.id}`}
                >
                  {toggleStatusMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Settings className="w-4 h-4 mr-2" />
                  )}
                  {notice.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedNotice?.title}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewDialogOpen(false)}
                data-testid="button-close-view"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto">
            {selectedNotice && (
              <div className="space-y-4">
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  {selectedNotice.mediaType === 'video' ? (
                    <video
                      src={`/api/maintenance-notices/${selectedNotice.imageFileId}/file`}
                      className="w-full h-full object-contain"
                      controls
                      autoPlay={false}
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={`/api/maintenance-notices/${selectedNotice.imageFileId}/file`}
                      alt={selectedNotice.title}
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label>Status</Label>
                    <Badge className={getStatusColor(selectedNotice.isActive)}>
                      {getStatusIcon(selectedNotice.isActive)}
                      <span className="ml-1">{selectedNotice.isActive ? 'Active' : 'Inactive'}</span>
                    </Badge>
                  </div>
                  <div>
                    <Label>File Size</Label>
                    <p>{(selectedNotice.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <div>
                    <Label>Created</Label>
                    <p>{new Date(selectedNotice.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label>Last Modified</Label>
                    <p>{new Date(selectedNotice.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Maintenance Notice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedNotice?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedNotice && deleteMutation.mutate(selectedNotice.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}