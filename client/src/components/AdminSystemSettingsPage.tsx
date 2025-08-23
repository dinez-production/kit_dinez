import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, Save, Shield, Globe, Database, Bell, 
  Mail, Smartphone, CreditCard, FileText, AlertTriangle,
  Server, Wifi, Lock, Key, Palette, Monitor, RefreshCw, 
  Download, Zap, Info, HardDriveIcon, Settings, 
  Clock, Phone
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthSync } from "@/hooks/useDataSync";
import { CacheManager } from "@/utils/cacheManager";
import { UpdateManager } from "@/utils/updateManager";
import { passiveUpdateDetector } from "@/utils/passiveUpdateDetector";
import { toast } from "sonner";

export default function AdminSystemSettingsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuthSync();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [versionInfo, setVersionInfo] = useState<{ version: string; cacheVersion: string }>({
    version: '1.0.0',
    cacheVersion: 'unknown'
  });

  // Fetch system settings
  const { data: systemSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['/api/system-settings'],
    staleTime: 5000,
  });

  // Maintenance mode state
  const [maintenanceSettings, setMaintenanceSettings] = useState({
    isActive: false,
    title: 'System Maintenance',
    message: 'We are currently performing system maintenance. Please check back later.',
    estimatedTime: '',
    contactInfo: ''
  });

  // Update maintenance settings when data loads
  React.useEffect(() => {
    if (systemSettings) {
      const settings = systemSettings as any;
      setMaintenanceSettings({
        isActive: settings.maintenanceMode?.isActive || false,
        title: settings.maintenanceMode?.title || 'System Maintenance',
        message: settings.maintenanceMode?.message || 'We are currently performing system maintenance. Please check back later.',
        estimatedTime: settings.maintenanceMode?.estimatedTime || '',
        contactInfo: settings.maintenanceMode?.contactInfo || ''
      });
    }
  }, [systemSettings]);

  // Maintenance mode update mutation
  const updateMaintenanceMutation = useMutation({
    mutationFn: async (updateData: any) => {
      return apiRequest('/api/system-settings/maintenance', {
        method: 'PATCH',
        body: JSON.stringify({
          ...updateData,
          updatedBy: user?.id
        }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system-settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/system-settings/maintenance-status'] });
      toast({
        title: "Maintenance Settings Updated",
        description: "Maintenance mode settings have been saved successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating maintenance settings:', error);
      toast({
        title: "Error",
        description: "Failed to update maintenance settings",
        variant: "destructive"
      });
    }
  });

  const [generalSettings, setGeneralSettings] = useState({
    canteenName: "KIT College Canteen",
    operatingHours: "9:00 AM - 9:00 PM",
    deliveryCharges: 20,
    taxRate: 5,
    currency: "INR",
    timezone: "Asia/Kolkata",
    language: "English"
  });

  const [features, setFeatures] = useState({
    onlineOrdering: true,
    mobileApp: true,
    smsNotifications: true,
    emailNotifications: true,
    pushNotifications: true,
    loyaltyProgram: false,
    multiplePayments: true,
    orderTracking: true,
    feedbackSystem: true,
    promotions: true
  });

  const [security, setSecurity] = useState({
    twoFactorAuth: false,
    sessionTimeout: 30,
    passwordPolicy: "Standard",
    dataEncryption: true,
    auditLogs: true,
    backupFrequency: "Daily"
  });

  const [notifications, setNotifications] = useState({
    orderNotifications: true,
    lowStockAlerts: true,
    systemAlerts: true,
    revenueReports: false,
    customerFeedback: true
  });

  // Load version info and update status on component mount
  React.useEffect(() => {
    // Check for version info
    UpdateManager.getVersionInfo().then(setVersionInfo);
    
    // Check if update is available
    const checkUpdateStatus = () => {
      const manager = UpdateManager.getInstance();
      setUpdateAvailable(manager.isUpdateReady());
    };
    
    checkUpdateStatus();
    
    // Check periodically
    const interval = setInterval(checkUpdateStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "System settings have been updated successfully",
    });
  };

  const toggleFeature = (feature: string) => {
    setFeatures(prev => ({
      ...prev,
      [feature]: !prev[feature as keyof typeof prev]
    }));
  };

  const toggleNotification = (notification: string) => {
    setNotifications(prev => ({
      ...prev,
      [notification]: !prev[notification as keyof typeof prev]
    }));
  };

  // Maintenance mode handlers
  const toggleMaintenanceMode = async () => {
    const newIsActive = !maintenanceSettings.isActive;
    
    // Update local state immediately for responsiveness
    setMaintenanceSettings(prev => ({ ...prev, isActive: newIsActive }));
    
    // Update via API
    await updateMaintenanceMutation.mutateAsync({
      isActive: newIsActive,
      title: maintenanceSettings.title,
      message: maintenanceSettings.message,
      estimatedTime: maintenanceSettings.estimatedTime,
      contactInfo: maintenanceSettings.contactInfo
    });
  };

  const updateMaintenanceDetails = async () => {
    await updateMaintenanceMutation.mutateAsync({
      isActive: maintenanceSettings.isActive,
      title: maintenanceSettings.title,
      message: maintenanceSettings.message,
      estimatedTime: maintenanceSettings.estimatedTime,
      contactInfo: maintenanceSettings.contactInfo
    });
  };

  const handleMaintenanceFieldChange = (field: string, value: string) => {
    setMaintenanceSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    try {
      await CacheManager.forceRefresh();
    } catch (error) {
      console.error('Force refresh failed:', error);
      toast({
        title: "Error",
        description: "Refresh failed. Please reload manually.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCheckForUpdates = async () => {
    try {
      toast({
        title: "Checking for Updates",
        description: "Checking for new app versions..."
      });
      await passiveUpdateDetector.manualCheck();
      toast({
        title: "Success",
        description: "Update check completed"
      });
    } catch (error) {
      console.error('Update check failed:', error);
      toast({
        title: "Error",
        description: "Failed to check for updates",
        variant: "destructive"
      });
    }
  };

  const handleUpdateApp = () => {
    const manager = UpdateManager.getInstance();
    manager.applyUpdate();
  };

  const handleClearCache = async () => {
    try {
      toast({
        title: "Clearing Cache",
        description: "Clearing app cache..."
      });
      await CacheManager.clearAllCaches();
      toast({
        title: "Success",
        description: "Cache cleared successfully. App will reload in 2 seconds."
      });
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Cache clear failed:', error);
      toast({
        title: "Error",
        description: "Failed to clear cache",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setLocation("/admin")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
              <p className="text-sm text-muted-foreground">Configure application settings and features</p>
            </div>
          </div>
          <Button variant="food" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save All Changes
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="w-5 h-5" />
              <span>General Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="canteenName">Canteen Name</Label>
                <Input
                  id="canteenName"
                  value={generalSettings.canteenName}
                  onChange={(e) => setGeneralSettings(prev => ({ ...prev, canteenName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="operatingHours">Operating Hours</Label>
                <Input
                  id="operatingHours"
                  value={generalSettings.operatingHours}
                  onChange={(e) => setGeneralSettings(prev => ({ ...prev, operatingHours: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryCharges">Delivery Charges (₹)</Label>
                <Input
                  id="deliveryCharges"
                  type="number"
                  value={generalSettings.deliveryCharges}
                  onChange={(e) => setGeneralSettings(prev => ({ ...prev, deliveryCharges: parseInt(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  value={generalSettings.taxRate}
                  onChange={(e) => setGeneralSettings(prev => ({ ...prev, taxRate: parseInt(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={generalSettings.timezone} onValueChange={(value) => setGeneralSettings(prev => ({ ...prev, timezone: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Mode */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Maintenance Mode</span>
              <Badge 
                variant={maintenanceSettings.isActive ? "destructive" : "secondary"}
                data-testid="maintenance-status"
              >
                {maintenanceSettings.isActive ? "ACTIVE" : "Inactive"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main Toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/20">
              <div className="flex items-center space-x-3">
                <AlertTriangle className={`w-6 h-6 ${maintenanceSettings.isActive ? 'text-red-600' : 'text-amber-600'}`} />
                <div>
                  <h3 className="font-medium">System Maintenance Mode</h3>
                  <p className="text-sm text-muted-foreground">
                    {maintenanceSettings.isActive 
                      ? "⚠️ Application is currently in maintenance mode - users cannot access the app"
                      : "Toggle to enable maintenance mode and block user access"
                    }
                  </p>
                </div>
              </div>
              <Switch
                checked={maintenanceSettings.isActive}
                onCheckedChange={toggleMaintenanceMode}
                disabled={updateMaintenanceMutation.isPending}
                data-testid="switch-maintenance-mode"
              />
            </div>

            {/* Maintenance Details */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maintenanceTitle">Maintenance Title</Label>
                <Input
                  id="maintenanceTitle"
                  value={maintenanceSettings.title}
                  onChange={(e) => handleMaintenanceFieldChange('title', e.target.value)}
                  placeholder="System Maintenance"
                  data-testid="input-maintenance-title"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maintenanceMessage">Maintenance Message</Label>
                <Textarea
                  id="maintenanceMessage"
                  value={maintenanceSettings.message}
                  onChange={(e) => handleMaintenanceFieldChange('message', e.target.value)}
                  placeholder="We are currently performing system maintenance. Please check back later."
                  rows={3}
                  data-testid="textarea-maintenance-message"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estimatedTime" className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>Estimated Duration (Optional)</span>
                  </Label>
                  <Input
                    id="estimatedTime"
                    value={maintenanceSettings.estimatedTime}
                    onChange={(e) => handleMaintenanceFieldChange('estimatedTime', e.target.value)}
                    placeholder="e.g., 2 hours, 30 minutes"
                    data-testid="input-estimated-time"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contactInfo" className="flex items-center space-x-1">
                    <Phone className="w-4 h-4" />
                    <span>Contact Information (Optional)</span>
                  </Label>
                  <Input
                    id="contactInfo"
                    value={maintenanceSettings.contactInfo}
                    onChange={(e) => handleMaintenanceFieldChange('contactInfo', e.target.value)}
                    placeholder="e.g., support@kitcanteen.com or +91-1234567890"
                    data-testid="input-contact-info"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={updateMaintenanceDetails}
                disabled={updateMaintenanceMutation.isPending}
                className="flex-1"
                data-testid="button-save-maintenance"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateMaintenanceMutation.isPending ? "Saving..." : "Save Maintenance Settings"}
              </Button>
              
              {maintenanceSettings.isActive && (
                <Button 
                  onClick={() => toggleMaintenanceMode()}
                  variant="outline"
                  disabled={updateMaintenanceMutation.isPending}
                  className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
                  data-testid="button-disable-maintenance"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Disable Maintenance Mode
                </Button>
              )}
            </div>

            {/* Warning Note */}
            <div className="text-xs text-gray-600 bg-gray-50 dark:bg-gray-900 rounded p-3">
              <p className="mb-2"><strong>⚠️ Important:</strong></p>
              <ul className="space-y-1 text-xs">
                <li>• When maintenance mode is active, users will see a full-screen maintenance message</li>
                <li>• Users cannot access any part of the application during maintenance</li>
                <li>• Admin users can still access the admin panel to toggle maintenance mode off</li>
                <li>• The maintenance status is checked every 30 seconds automatically</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Feature Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Monitor className="w-5 h-5" />
              <span>Feature Controls</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(features).map(([feature, enabled]) => (
                <div key={feature} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h3 className="font-medium capitalize">{feature.replace(/([A-Z])/g, ' $1').trim()}</h3>
                    <p className="text-sm text-muted-foreground">
                      {feature === 'onlineOrdering' && 'Allow customers to place orders online'}
                      {feature === 'mobileApp' && 'Enable mobile application features'}
                      {feature === 'smsNotifications' && 'Send SMS updates to customers'}
                      {feature === 'emailNotifications' && 'Send email notifications'}
                      {feature === 'pushNotifications' && 'Send push notifications to mobile'}
                      {feature === 'loyaltyProgram' && 'Enable customer loyalty rewards'}
                      {feature === 'multiplePayments' && 'Accept multiple payment methods'}
                      {feature === 'orderTracking' && 'Real-time order tracking'}
                      {feature === 'feedbackSystem' && 'Customer feedback and ratings'}
                      {feature === 'promotions' && 'Promotional offers and discounts'}
                    </p>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={() => toggleFeature(feature)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Security & Privacy</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h3 className="font-medium">Two-Factor Authentication</h3>
                  <p className="text-sm text-muted-foreground">Require 2FA for admin accounts</p>
                </div>
                <Switch
                  checked={security.twoFactorAuth}
                  onCheckedChange={(checked) => setSecurity(prev => ({ ...prev, twoFactorAuth: checked }))}
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h3 className="font-medium">Data Encryption</h3>
                  <p className="text-sm text-muted-foreground">Encrypt sensitive data</p>
                </div>
                <Switch
                  checked={security.dataEncryption}
                  onCheckedChange={(checked) => setSecurity(prev => ({ ...prev, dataEncryption: checked }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Session Timeout (minutes)</Label>
                <Input
                  type="number"
                  value={security.sessionTimeout}
                  onChange={(e) => setSecurity(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Password Policy</Label>
                <Select value={security.passwordPolicy} onValueChange={(value) => setSecurity(prev => ({ ...prev, passwordPolicy: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Basic">Basic (6+ characters)</SelectItem>
                    <SelectItem value="Standard">Standard (8+ chars, mixed case)</SelectItem>
                    <SelectItem value="Strong">Strong (12+ chars, symbols)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="w-5 h-5" />
              <span>Notification Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(notifications).map(([notification, enabled]) => (
                <div key={notification} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h3 className="font-medium capitalize">{notification.replace(/([A-Z])/g, ' $1').trim()}</h3>
                    <p className="text-sm text-muted-foreground">
                      {notification === 'orderNotifications' && 'Get notified about new orders'}
                      {notification === 'lowStockAlerts' && 'Alerts when inventory is low'}
                      {notification === 'systemAlerts' && 'System health and error notifications'}
                      {notification === 'revenueReports' && 'Daily revenue summary emails'}
                      {notification === 'customerFeedback' && 'New customer feedback notifications'}
                    </p>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={() => toggleNotification(notification)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Server className="w-5 h-5" />
              <span>System Health & Maintenance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 border rounded-lg text-center">
                  <Database className="w-8 h-8 mx-auto mb-2 text-success" />
                  <p className="font-medium">Database</p>
                  <Badge variant="default">Healthy</Badge>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <Wifi className="w-8 h-8 mx-auto mb-2 text-success" />
                  <p className="font-medium">Network</p>
                  <Badge variant="default">Online</Badge>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <Server className="w-8 h-8 mx-auto mb-2 text-warning" />
                  <p className="font-medium">Server</p>
                  <Badge variant="secondary">Maintenance</Badge>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <Shield className="w-8 h-8 mx-auto mb-2 text-success" />
                  <p className="font-medium">Security</p>
                  <Badge variant="default">Secure</Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <Button variant="outline" className="w-full">
                  <Database className="w-4 h-4 mr-2" />
                  Backup Now
                </Button>
                <Button variant="outline" className="w-full">
                  <FileText className="w-4 h-4 mr-2" />
                  Export Logs
                </Button>
                <Button variant="outline" className="w-full">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  System Check
                </Button>
                <Button variant="outline" className="w-full">
                  <Monitor className="w-4 h-4 mr-2" />
                  Performance
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* App Updates & Cache Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="w-5 h-5" />
              <span>App Updates & Cache Management</span>
              {updateAvailable && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <Download className="w-3 h-3 mr-1" />
                  Update Available
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Version Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium flex items-center space-x-2">
                      <Info className="w-4 h-4" />
                      <span>Current Version</span>
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">App version: <span className="font-mono">{versionInfo.version}</span></p>
                  <p className="text-sm text-muted-foreground">Cache version: <span className="font-mono">{versionInfo.cacheVersion}</span></p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium flex items-center space-x-2">
                      <Server className="w-4 h-4" />
                      <span>Update Status</span>
                    </h3>
                    <Badge variant={updateAvailable ? "default" : "secondary"}>
                      {updateAvailable ? "Update Ready" : "Up to Date"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {updateAvailable 
                      ? "A new version is available and ready to install."
                      : "You're running the latest version of the application."
                    }
                  </p>
                </div>
              </div>

              {/* Update Available Section */}
              {updateAvailable && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start mb-3">
                    <Info className="w-4 h-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="text-green-800 font-medium">New version ready!</p>
                      <p className="text-green-700 mt-1">
                        An updated version with improvements and bug fixes is available.
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleUpdateApp}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="sm"
                    data-testid="button-update-app"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Install Update Now
                  </Button>
                </div>
              )}

              {/* Update Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  onClick={handleCheckForUpdates}
                  variant="outline"
                  className="w-full"
                  data-testid="button-check-updates"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Check for Updates
                </Button>
                <Button 
                  onClick={handleClearCache}
                  variant="outline"
                  className="w-full"
                  data-testid="button-clear-cache"
                >
                  <HardDriveIcon className="w-4 h-4 mr-2" />
                  Clear Cache
                </Button>
                <Button 
                  onClick={handleForceRefresh}
                  disabled={isRefreshing}
                  variant="outline"
                  className="w-full"
                  data-testid="button-force-refresh"
                >
                  {isRefreshing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Force Refresh
                    </>
                  )}
                </Button>
              </div>

              {/* Instructions */}
              <div className="text-xs text-gray-500 bg-gray-50 rounded p-3">
                <p className="mb-2"><strong>Update Management:</strong></p>
                <ul className="space-y-1 text-xs">
                  <li><strong>• Check for Updates:</strong> Manually check for new app versions</li>
                  <li><strong>• Clear Cache:</strong> Clear app cache while preserving user session</li>
                  <li><strong>• Force Refresh:</strong> Complete app reload with cache bypass</li>
                </ul>
                <p className="mt-2"><strong>Note:</strong> Updates are automatically detected. When available, just click "Install Update Now" - no app reinstallation needed.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Integration Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="w-5 h-5" />
              <span>Integrations & APIs</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium flex items-center space-x-2">
                      <CreditCard className="w-4 h-4" />
                      <span>Payment Gateway</span>
                    </h3>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">PhonePe Test Gateway integration for payments</p>
                  <Button variant="outline" size="sm" className="mt-2">Configure</Button>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium flex items-center space-x-2">
                      <Mail className="w-4 h-4" />
                      <span>Email Service</span>
                    </h3>
                    <Badge variant="secondary">Inactive</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">SMTP configuration for emails</p>
                  <Button variant="outline" size="sm" className="mt-2">Setup</Button>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium flex items-center space-x-2">
                      <Smartphone className="w-4 h-4" />
                      <span>SMS Service</span>
                    </h3>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">SMS notifications via Twilio</p>
                  <Button variant="outline" size="sm" className="mt-2">Configure</Button>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium flex items-center space-x-2">
                      <Key className="w-4 h-4" />
                      <span>API Access</span>
                    </h3>
                    <Badge variant="default">Enabled</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">External API access keys</p>
                  <Button variant="outline" size="sm" className="mt-2">Manage</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}