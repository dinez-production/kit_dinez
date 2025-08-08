import { useEffect } from "react";
import { useLocation } from "wouter";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import SyncStatus from "./SyncStatus";
import { useAuthSync } from "@/hooks/useDataSync";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isAdmin, isSuperAdmin } = useAuthSync();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    setLocation("/login");
  };

  // Enhanced security check for admin access
  useEffect(() => {
    if (!isAuthenticated || (!isAdmin && !isSuperAdmin)) {
      toast.error("Access denied. Admin authentication required.");
      setLocation("/login");
      return;
    }
  }, [isAuthenticated, isAdmin, isSuperAdmin, setLocation]);

  // Return early if not properly authenticated
  if (!isAuthenticated || (!isAdmin && !isSuperAdmin)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Access Denied</h2>
          <p className="text-muted-foreground mb-4">Admin authentication required</p>
          <Button onClick={() => setLocation("/login")}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Enhanced Header with Sync Status */}
          <header className="h-14 flex items-center justify-between border-b bg-card px-4">
            <div className="flex items-center space-x-4">
              <SidebarTrigger />
              <div>
                <h1 className="text-lg font-semibold text-foreground">Admin Control Panel</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <SyncStatus />
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'} - {user?.email}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-2"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}