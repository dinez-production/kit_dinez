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
  
  // Query for maintenance status
  const { data: maintenanceStatus } = useQuery({
    queryKey: ['/api/system-settings/maintenance-status'],
    refetchInterval: 30000, // Check every 30 seconds
    staleTime: 0, // Always fresh
  });

  // Check if maintenance is active
  const isMaintenanceActive = (maintenanceStatus as any)?.isActive || false;
  
  // Allow admin/canteen owner access during maintenance if specified
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';
  const isCanteenOwner = user?.role === 'canteen_owner' || user?.role === 'canteen-owner';
  const shouldAllowAccess = allowAdminAccess && (isAdmin || isCanteenOwner);

  // If maintenance is active and user should not have access, show maintenance screen
  if (isMaintenanceActive && !shouldAllowAccess) {
    return (
      <MaintenanceScreen
        title={(maintenanceStatus as any)?.title || 'System Maintenance'}
        message={(maintenanceStatus as any)?.message || 'We are currently performing system maintenance. Please check back later.'}
        estimatedTime={(maintenanceStatus as any)?.estimatedTime}
        contactInfo={(maintenanceStatus as any)?.contactInfo}
        showAuthOptions={false} // Don't show auth options since user is already authenticated
        isAuthenticated={true}
      />
    );
  }

  // If maintenance is not active or user has access, render children
  return <>{children}</>;
}