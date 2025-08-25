import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import MaintenanceScreen from "@/components/MaintenanceScreen";

interface MaintenanceWrapperProps {
  children: React.ReactNode;
  allowAdminAccess?: boolean; // Allow admins to access during maintenance
}

export default function MaintenanceWrapper({ 
  children, 
  allowAdminAccess = false 
}: MaintenanceWrapperProps) {
  const { user } = useAuth();
  
  // Query for user-specific maintenance status (uses the new targeting logic)
  const { data: userMaintenanceCheck } = useQuery({
    queryKey: [`/api/system-settings/maintenance-status/${user?.id}`],
    enabled: !!user?.id, // Only query when user ID is available
    staleTime: 30000, // Use cached data for 30 seconds
  });

  // Fallback: Query for general maintenance status if user-specific query fails
  const { data: generalMaintenanceStatus } = useQuery({
    queryKey: ['/api/system-settings/maintenance-status'],
    enabled: !userMaintenanceCheck, // Only query if user-specific check isn't available
    staleTime: 60000, // Use cached data for 1 minute
  });

  // If no user is authenticated, don't show maintenance (let auth handle this)
  if (!user?.id) {
    return <>{children}</>;
  }

  // Use user-specific maintenance check if available, otherwise fall back to admin bypass logic
  if (userMaintenanceCheck) {
    const maintenanceCheck = userMaintenanceCheck as any;
    const shouldShowMaintenance = maintenanceCheck.showMaintenance;
    
    if (shouldShowMaintenance) {
      return (
        <MaintenanceScreen
          title={maintenanceCheck.maintenanceInfo?.title || 'System Maintenance'}
          message={maintenanceCheck.maintenanceInfo?.message || 'We are currently performing system maintenance. Please check back later.'}
          estimatedTime={maintenanceCheck.maintenanceInfo?.estimatedTime}
          contactInfo={maintenanceCheck.maintenanceInfo?.contactInfo}
          showAuthOptions={false} // Don't show auth options since user is already authenticated
          isAuthenticated={true}
        />
      );
    }
  } else if (generalMaintenanceStatus) {
    // Fallback to old logic if user-specific check isn't available
    const maintenanceStatus = generalMaintenanceStatus as any;
    const isMaintenanceActive = maintenanceStatus.isActive || false;
    
    // Allow admin/canteen owner access during maintenance if specified
    const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';
    const isCanteenOwner = user?.role === 'canteen_owner' || user?.role === 'canteen-owner';
    const shouldAllowAccess = allowAdminAccess && (isAdmin || isCanteenOwner);

    // If maintenance is active and user should not have access, show maintenance screen
    if (isMaintenanceActive && !shouldAllowAccess) {
      return (
        <MaintenanceScreen
          title={maintenanceStatus.title || 'System Maintenance'}
          message={maintenanceStatus.message || 'We are currently performing system maintenance. Please check back later.'}
          estimatedTime={maintenanceStatus.estimatedTime}
          contactInfo={maintenanceStatus.contactInfo}
          showAuthOptions={false} // Don't show auth options since user is already authenticated
          isAuthenticated={true}
        />
      );
    }
  }

  // If maintenance is not active or user doesn't need to see it, render children
  return <>{children}</>;
}