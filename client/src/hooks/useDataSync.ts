import { useQuery } from "@tanstack/react-query";
import type { MenuItem, Category, Order, User } from "@shared/schema";

/**
 * Custom hook for synchronized data fetching across all dashboards
 * Ensures real-time data consistency between admin, canteen owner, and student views
 */
export function useDataSync() {
  // Categories query - optimized refresh
  const categoriesQuery = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    staleTime: 1000 * 60 * 10, // 10 minutes (categories change infrequently)
    refetchOnMount: true,
    refetchOnWindowFocus: false, // Categories don't need frequent refetch
  });

  // Menu items query - balanced refresh
  const menuItemsQuery = useQuery<MenuItem[]>({
    queryKey: ['/api/menu'],
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Orders query - more frequent for real-time updates
  const ordersQuery = useQuery<Order[]>({
    queryKey: ['/api/orders'],
    staleTime: 1000 * 60, // 1 minute for orders
    refetchOnMount: true,
    refetchOnWindowFocus: false, // Disable window focus refetch
    refetchInterval: false, // Disable polling - using SSE for real-time updates
  });

  // Analytics query - least frequent
  const analyticsQuery = useQuery({
    queryKey: ['/api/admin/analytics'],
    staleTime: 1000 * 60 * 15, // 15 minutes for analytics
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: false, // Don't retry analytics failures
    retryOnMount: false,
  });

  // Computed values for dashboard consistency
  const stats = {
    totalCategories: categoriesQuery.data?.length || 0,
    totalMenuItems: menuItemsQuery.data?.length || 0,
    availableItems: menuItemsQuery.data?.filter(item => item.available).length || 0,
    totalOrders: ordersQuery.data?.length || 0,
    pendingOrders: ordersQuery.data?.filter(order => order.status === 'preparing').length || 0,
    completedOrders: ordersQuery.data?.filter(order => order.status === 'completed').length || 0,
    totalRevenue: ordersQuery.data?.reduce((sum, order) => sum + order.amount, 0) || 0,
  };

  // Combined loading state
  const isLoading = categoriesQuery.isLoading || menuItemsQuery.isLoading || ordersQuery.isLoading;

  // Combined error state (excluding analytics errors as they're optional)
  const hasError = categoriesQuery.error || menuItemsQuery.error || ordersQuery.error;

  return {
    // Raw data
    categories: categoriesQuery.data || [],
    menuItems: menuItemsQuery.data || [],
    orders: ordersQuery.data || [],
    analytics: analyticsQuery.data,
    
    // Computed stats
    stats,
    
    // Loading and error states
    isLoading,
    hasError,
    
    // Refetch functions for manual sync
    refetch: {
      categories: categoriesQuery.refetch,
      menuItems: menuItemsQuery.refetch,
      orders: ordersQuery.refetch,
      analytics: analyticsQuery.refetch,
      all: () => {
        categoriesQuery.refetch();
        menuItemsQuery.refetch();
        ordersQuery.refetch();
        analyticsQuery.refetch();
      }
    },
    
    // Individual query states for granular control
    queries: {
      categories: categoriesQuery,
      menuItems: menuItemsQuery,
      orders: ordersQuery,
      analytics: analyticsQuery,
    }
  };
}

/**
 * Hook specifically for authentication state synchronization
 */
export function useAuthSync() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  
  // Debug logging for authentication state
  console.log("useAuthSync Debug:", {
    localStorage_user: localStorage.getItem('user'),
    parsed_user: user,
    isAuthenticated: !!user,
    userRole: user?.role
  });
  
  return {
    user,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
    isSuperAdmin: user?.role === 'super_admin',
    isCanteenOwner: user?.role === 'canteen_owner',
    isStudent: user?.role === 'student',
    isStaff: user?.role === 'staff',
    hasRole: (role: string) => user?.role === role,
  };
}