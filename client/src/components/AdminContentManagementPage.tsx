import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, FileText, Image, Video, Plus, Edit, 
  Trash2, Eye, Upload, Save, Globe, Calendar,
  Search, Filter, X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminContentManagementPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pages");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [itemType, setItemType] = useState("");
  
  // Edit form state
  const [editForm, setEditForm] = useState<any>({});

  // Empty pages data - will be connected to CMS database when implemented
  const [pagesData, setPagesData] = useState<any[]>([]);

  const [mediaData, setMediaData] = useState<any[]>([]);

  const [bannersData, setBannersData] = useState<any[]>([]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Published":
      case "Active": return "bg-success text-success-foreground";
      case "Draft":
      case "Scheduled": return "bg-warning text-warning-foreground";
      case "Expired": return "bg-secondary text-secondary-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  // Button handlers
  const handleView = (item: any, type: string) => {
    setSelectedItem(item);
    setItemType(type);
    setViewDialogOpen(true);
  };

  const handleEdit = (item: any, type: string) => {
    setSelectedItem(item);
    setItemType(type);
    setEditForm({ ...item });
    setEditDialogOpen(true);
  };

  const handleDelete = (item: any, type: string) => {
    setSelectedItem(item);
    setItemType(type);
    setDeleteDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (itemType === "pages") {
      setPagesData(prev => prev.map(item => 
        item.id === selectedItem.id ? { ...item, ...editForm } : item
      ));
    } else if (itemType === "media") {
      setMediaData(prev => prev.map(item => 
        item.id === selectedItem.id ? { ...item, ...editForm } : item
      ));
    } else if (itemType === "banners") {
      setBannersData(prev => prev.map(item => 
        item.id === selectedItem.id ? { ...item, ...editForm } : item
      ));
    }
    
    toast({
      title: "Item Updated",
      description: `${itemType.slice(0, -1)} has been successfully updated.`,
    });
    setEditDialogOpen(false);
  };

  const handleConfirmDelete = () => {
    if (itemType === "pages") {
      setPagesData(prev => prev.filter(item => item.id !== selectedItem.id));
    } else if (itemType === "media") {
      setMediaData(prev => prev.filter(item => item.id !== selectedItem.id));
    } else if (itemType === "banners") {
      setBannersData(prev => prev.filter(item => item.id !== selectedItem.id));
    }
    
    toast({
      title: "Item Deleted",
      description: `${itemType.slice(0, -1)} has been successfully deleted.`,
    });
    setDeleteDialogOpen(false);
  };

  const handleFormChange = (field: string, value: string) => {
    setEditForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const renderPages = () => (
    <div className="space-y-4">
      {pagesData.filter(page => 
        page.title.toLowerCase().includes(searchTerm.toLowerCase())
      ).map((page) => (
        <div key={page.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <FileText className="h-4 w-4 text-primary" />
                <h4 className="font-medium text-foreground">{page.title}</h4>
                <Badge className={getStatusColor(page.status)}>
                  {page.status}
                </Badge>
              </div>
              <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                <span>Slug: {page.slug}</span>
                <span>Modified: {page.lastModified}</span>
                <span>Views: {page.views}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleView(page, "pages")}
                title="View Page"
              >
                <Eye className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleEdit(page, "pages")}
                title="Edit Page"
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleDelete(page, "pages")}
                title="Delete Page"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderMedia = () => (
    <div className="space-y-4">
      {mediaData.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      ).map((item) => (
        <div key={item.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {item.type === "Image" ? (
                <Image className="h-4 w-4 text-primary" />
              ) : (
                <Video className="h-4 w-4 text-primary" />
              )}
              <div>
                <h4 className="font-medium text-foreground">{item.name}</h4>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span>{item.type}</span>
                  <span>{item.size}</span>
                  {item.dimensions && <span>{item.dimensions}</span>}
                  {item.duration && <span>{item.duration}</span>}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Used in: {item.usedIn.join(", ")}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleView(item, "media")}
                title="View Media"
              >
                <Eye className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleEdit(item, "media")}
                title="Edit Media"
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleDelete(item, "media")}
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

  const renderBanners = () => (
    <div className="space-y-4">
      {bannersData.filter(banner => 
        banner.title.toLowerCase().includes(searchTerm.toLowerCase())
      ).map((banner) => (
        <div key={banner.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <Globe className="h-4 w-4 text-primary" />
                <h4 className="font-medium text-foreground">{banner.title}</h4>
                <Badge className={getStatusColor(banner.status)}>
                  {banner.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{banner.description}</p>
              <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                <span>Period: {banner.startDate} to {banner.endDate}</span>
                <span>Clicks: {banner.clicks}</span>
                <span>Conversions: {banner.conversions}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleView(banner, "banners")}
                title="View Banner"
              >
                <Eye className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleEdit(banner, "banners")}
                title="Edit Banner"
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleDelete(banner, "banners")}
                title="Delete Banner"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/admin")}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Content Management</h1>
            <p className="text-muted-foreground">Manage pages, media, and promotional content</p>
          </div>
        </div>
        <Button 
          className="bg-primary text-primary-foreground"
          onClick={() => toast({ title: "Create New", description: "Create new dialog would open here" })}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2">
        {[
          { key: "pages", label: "Pages", icon: FileText },
          { key: "media", label: "Media", icon: Image },
          { key: "banners", label: "Banners", icon: Globe }
        ].map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={activeTab === key ? "default" : "outline"}
            onClick={() => setActiveTab(key)}
            className="flex items-center space-x-2"
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </Button>
        ))}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle className="capitalize">{activeTab}</CardTitle>
        </CardHeader>
        <CardContent>
          {activeTab === "pages" && renderPages()}
          {activeTab === "media" && renderMedia()}
          {activeTab === "banners" && renderBanners()}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>View {itemType?.slice(0, -1)}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedItem && (
              <div className="space-y-3">
                {Object.entries(selectedItem).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-3 gap-4">
                    <Label className="text-right capitalize font-medium">
                      {key.replace(/([A-Z])/g, ' $1')}:
                    </Label>
                    <div className="col-span-2 text-sm">
                      {Array.isArray(value) ? value.join(', ') : String(value)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Edit className="h-5 w-5" />
              <span>Edit {itemType?.slice(0, -1)}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {itemType === "pages" && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">Title</Label>
                  <Input
                    id="title"
                    value={editForm.title || ""}
                    onChange={(e) => handleFormChange("title", e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="slug" className="text-right">Slug</Label>
                  <Input
                    id="slug"
                    value={editForm.slug || ""}
                    onChange={(e) => handleFormChange("slug", e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="status" className="text-right">Status</Label>
                  <Select value={editForm.status || ""} onValueChange={(value) => handleFormChange("status", value)}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      <SelectItem value="Published">Published</SelectItem>
                      <SelectItem value="Draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            
            {itemType === "media" && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Name</Label>
                  <Input
                    id="name"
                    value={editForm.name || ""}
                    onChange={(e) => handleFormChange("name", e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right">Type</Label>
                  <Select value={editForm.type || ""} onValueChange={(value) => handleFormChange("type", value)}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      <SelectItem value="Image">Image</SelectItem>
                      <SelectItem value="Video">Video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            
            {itemType === "banners" && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">Title</Label>
                  <Input
                    id="title"
                    value={editForm.title || ""}
                    onChange={(e) => handleFormChange("title", e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="description" className="text-right pt-2">Description</Label>
                  <Textarea
                    id="description"
                    value={editForm.description || ""}
                    onChange={(e) => handleFormChange("description", e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="status" className="text-right">Status</Label>
                  <Select value={editForm.status || ""} onValueChange={(value) => handleFormChange("status", value)}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Scheduled">Scheduled</SelectItem>
                      <SelectItem value="Expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {itemType?.slice(0, -1)}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedItem?.title || selectedItem?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}