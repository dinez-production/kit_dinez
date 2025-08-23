import { AlertTriangle, Clock, Phone, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MaintenanceScreenProps {
  title?: string;
  message?: string;
  estimatedTime?: string;
  contactInfo?: string;
}

export default function MaintenanceScreen({
  title = "System Maintenance",
  message = "We are currently performing system maintenance. Please check back later.",
  estimatedTime,
  contactInfo
}: MaintenanceScreenProps) {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-950 flex items-center justify-center p-4" data-testid="maintenance-screen">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="relative z-10 w-full max-w-md">
        <Card className="border-amber-200 dark:border-amber-800 shadow-lg backdrop-blur-sm bg-white/90 dark:bg-gray-900/90" data-testid="maintenance-card">
          <CardHeader className="text-center pb-2">
            {/* Icon */}
            <div className="mx-auto mb-4 w-16 h-16 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center" data-testid="maintenance-icon">
              <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            
            {/* Status Badge */}
            <Badge variant="outline" className="mx-auto mb-4 border-amber-400 text-amber-700 dark:text-amber-300" data-testid="maintenance-status">
              <Clock className="h-3 w-3 mr-1" />
              Under Maintenance
            </Badge>
            
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="maintenance-title">
              {title}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="text-center space-y-6">
            <CardDescription className="text-base text-gray-600 dark:text-gray-300 leading-relaxed" data-testid="maintenance-message">
              {message}
            </CardDescription>
            
            {/* Estimated Time */}
            {estimatedTime && (
              <div className="bg-amber-50 dark:bg-amber-950/50 rounded-lg p-4 border border-amber-200 dark:border-amber-800" data-testid="maintenance-estimated-time">
                <div className="flex items-center justify-center text-amber-700 dark:text-amber-300 mb-2">
                  <Clock className="h-4 w-4 mr-2" />
                  <span className="font-medium">Estimated Duration</span>
                </div>
                <p className="text-amber-800 dark:text-amber-200 font-semibold">
                  {estimatedTime}
                </p>
              </div>
            )}
            
            {/* Contact Information */}
            {contactInfo && (
              <div className="bg-blue-50 dark:bg-blue-950/50 rounded-lg p-4 border border-blue-200 dark:border-blue-800" data-testid="maintenance-contact">
                <div className="flex items-center justify-center text-blue-700 dark:text-blue-300 mb-2">
                  <Phone className="h-4 w-4 mr-2" />
                  <span className="font-medium">Need Help?</span>
                </div>
                <p className="text-blue-800 dark:text-blue-200 text-sm">
                  {contactInfo}
                </p>
              </div>
            )}
            
            {/* Actions */}
            <div className="space-y-3">
              <Button 
                onClick={handleRefresh}
                className="w-full bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-800 text-white"
                data-testid="button-refresh"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Check Again
              </Button>
              
              <p className="text-xs text-gray-500 dark:text-gray-400">
                We apologize for any inconvenience. The system will be back online shortly.
              </p>
            </div>
          </CardContent>
        </Card>
        
        {/* KIT Branding */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center space-x-2 text-gray-600 dark:text-gray-400">
            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
              <span className="text-primary text-sm font-bold">KIT</span>
            </div>
            <span className="text-sm">KIT-Canteen</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            Powered by KIT College
          </p>
        </div>
      </div>
      
      {/* Animated Background Elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-amber-200/10 dark:bg-amber-800/10 rounded-full animate-pulse"></div>
      <div className="absolute bottom-40 right-8 w-24 h-24 bg-orange-200/10 dark:bg-orange-800/10 rounded-full animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-yellow-200/10 dark:bg-yellow-800/10 rounded-full animate-pulse delay-500"></div>
    </div>
  );
}

// Add this CSS to your global styles for the grid pattern
const gridPatternCSS = `
.bg-grid-pattern {
  background-image: 
    linear-gradient(rgba(0, 0, 0, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 0, 0, 0.1) 1px, transparent 1px);
  background-size: 20px 20px;
}

@media (prefers-color-scheme: dark) {
  .bg-grid-pattern {
    background-image: 
      linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
  }
}
`;