import { useState } from "react";
import { useLocation } from "wouter";
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
  Server, Wifi, Lock, Key, Palette, Monitor
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminSystemSettingsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

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