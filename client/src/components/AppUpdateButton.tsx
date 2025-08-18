import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Download, Zap, Info } from "lucide-react";
import { UpdateManager } from "@/utils/updateManager";
import { passiveUpdateDetector } from "@/utils/passiveUpdateDetector";
import { toast } from "sonner";

export default function AppUpdateButton() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [versionInfo, setVersionInfo] = useState<{ version: string; cacheVersion: string }>({
    version: '1.0.0',
    cacheVersion: 'unknown'
  });

  useEffect(() => {
    // Check for version info
    UpdateManager.getVersionInfo().then(setVersionInfo);
    
    // Check if update is available (this would be set by the update manager)
    const checkUpdateStatus = () => {
      const manager = UpdateManager.getInstance();
      setUpdateAvailable(manager.isUpdateReady());
    };
    
    checkUpdateStatus();
    
    // Check periodically
    const interval = setInterval(checkUpdateStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    try {
      await UpdateManager.forceRefresh();
    } catch (error) {
      console.error('Force refresh failed:', error);
      toast.error('Refresh failed. Please reload manually.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCheckForUpdates = async () => {
    await passiveUpdateDetector.manualCheck();
  };

  const handleUpdateApp = () => {
    const manager = UpdateManager.getInstance();
    manager.applyUpdate();
  };

  return (
    <Card className="w-full max-w-md">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center">
              <Zap className="w-4 h-4 mr-2 text-blue-600" />
              App Updates
            </h3>
            {updateAvailable && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <Download className="w-3 h-3 mr-1" />
                Available
              </Badge>
            )}
          </div>

          {/* Version Info */}
          <div className="text-sm text-gray-600">
            <div className="flex items-center justify-between">
              <span>Version:</span>
              <span className="font-mono">{versionInfo.version}</span>
            </div>
          </div>

          {/* Update Available Section */}
          {updateAvailable && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start">
                <Info className="w-4 h-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-green-800 font-medium">New version ready!</p>
                  <p className="text-green-700 mt-1">
                    An updated version with improvements is available.
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleUpdateApp}
                className="w-full mt-3 bg-green-600 hover:bg-green-700"
                size="sm"
                data-testid="button-update-app"
              >
                <Download className="w-4 h-4 mr-2" />
                Update Now
              </Button>
            </div>
          )}

          {/* Manual Check Section */}
          <div className="border-t pt-3">
            <p className="text-sm text-gray-600 mb-3">
              Check manually for server updates when you need them.
            </p>
            <Button 
              onClick={handleCheckForUpdates}
              variant="outline"
              size="sm"
              className="w-full mb-2"
              data-testid="button-check-updates"
            >
              <Download className="w-4 h-4 mr-2" />
              Check for Updates
            </Button>
            <Button 
              onClick={handleForceRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
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
          <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
            <p><strong>Note:</strong> Updates are automatically detected. You don't need to reinstall the app - just click "Update Now" when available.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}