import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Router, Route, Switch } from "wouter";
import { CartProvider } from "@/contexts/CartContext";
import { useDeploymentDetection } from "@/utils/deploymentHook";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import SplashScreen from "./components/SplashScreen";
import LoginScreen from "./components/LoginScreen";
import HomeScreen from "./components/HomeScreen";
import MenuListingPage from "./components/MenuListingPage";
import DishDetailPage from "./components/DishDetailPage";
import CartPage from "./components/CartPage";
import CheckoutPage from "./components/CheckoutPage";
import RetryPaymentPage from "./components/RetryPaymentPage";
import OrderStatusPage from "./components/OrderStatusPage";
import OrdersPage from "./components/OrdersPage";
import ProfilePage from "./components/ProfilePage";
import AdminPanel from "./components/AdminPanel";
import NotificationsPage from "./components/NotificationsPage";
import PaymentMethodsPage from "./components/PaymentMethodsPage";
import SearchPage from "./components/SearchPage";
import PrivacyPolicyPage from "./components/PrivacyPolicyPage";
import TermsConditionsPage from "./components/TermsConditionsPage";
import AdminDashboard from "./components/AdminDashboard";
import AdminLayout from "./components/AdminLayout";
import EditAdminAccessPage from "./components/EditAdminAccessPage";
import AddNewAdminPage from "./components/AddNewAdminPage";
import AdminOrderManagementPage from "./components/AdminOrderManagementPage";
import AdminMenuManagementPage from "./components/AdminMenuManagementPage";
import AdminAnalyticsPage from "./components/AdminAnalyticsPage";
import AdminReportsPage from "./components/AdminReportsPage";
import AdminUserManagementPage from "./components/AdminUserManagementPage";
import AdminSystemSettingsPage from "./components/AdminSystemSettingsPage";

import AdminPaymentManagementPage from "./components/AdminPaymentManagementPage";
import AdminNotificationManagementPage from "./components/AdminNotificationManagementPage";
import AdminContentManagementPage from "./components/AdminContentManagementPage";
import AdminCouponManagement from "./components/AdminCouponManagement";
import AdminFeedbackManagementPage from "./components/AdminFeedbackManagementPage";
import AdminReviewManagementPage from "./components/AdminReviewManagementPage";
import AdminAccessPage from "./components/AdminAccessPage";
import AdminDatabasePage from "./components/AdminDatabasePage";
import AdminLoginIssues from "./pages/AdminLoginIssues";
import CanteenOwnerDashboard from "./components/CanteenOwnerDashboard";
import ViewAllQuickPicksPage from "./components/ViewAllQuickPicksPage";
import HelpSupportPage from "./components/HelpSupportPage";
import AboutPage from "./components/AboutPage";
import FavoritesPage from "./components/FavoritesPage";
import FeedbackPage from "./components/FeedbackPage";
import NotificationMaintenanceNotice from "./components/NotificationMaintenanceNotice";

import SendEmailPage from "./components/user-management/SendEmailPage";
import AddLoyaltyPointsPage from "./components/user-management/AddLoyaltyPointsPage";
import ApplyDiscountPage from "./components/user-management/ApplyDiscountPage";
import SendWarningPage from "./components/user-management/SendWarningPage";
import ExportUserDataPage from "./components/user-management/ExportUserDataPage";
import ImportUsersPage from "./components/user-management/ImportUsersPage";
import ReorderPage from "./components/ReorderPage";
import RateReviewPage from "./components/RateReviewPage";
import OrderDetailPage from "./components/OrderDetailPage";
import CanteenOrderDetailPage from "./components/CanteenOrderDetailPage";
import BarcodeScannerPage from "./components/BarcodeScannerPage";
import PaymentCallbackPage from "./components/PaymentCallbackPage";
import ProtectedRoute from "./components/ProtectedRoute";
import MaintenanceWrapper from "./components/MaintenanceWrapper";
import { InstallPWA } from "./components/InstallPWA";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const App = () => {
  // Enable deployment detection for cache invalidation
  useDeploymentDetection();
  
  // Enable activity tracking for mobile PWA session persistence
  useActivityTracker();

  // PWA installation URL normalization - ensure consistent entry point
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isPWALaunch = urlParams.get('pwa') === 'true' || 
                       window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator as any).standalone === true;

    // If this is a PWA launch from any URL other than root, redirect to root for consistent splash screen
    if (isPWALaunch && window.location.pathname !== '/') {
      console.log("PWA launch from non-root URL detected, redirecting to root:", window.location.pathname);
      window.history.replaceState({}, '', '/?pwa=true');
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <InstallPWA />
          <NotificationMaintenanceNotice />
          <Router>
        <Switch>
          <Route path="/" component={SplashScreen} />
          <Route path="/login" component={LoginScreen} />
          <Route path="/home">
            <MaintenanceWrapper>
              <HomeScreen />
            </MaintenanceWrapper>
          </Route>
          <Route path="/menu/:category">
            <MaintenanceWrapper>
              <MenuListingPage />
            </MaintenanceWrapper>
          </Route>
          <Route path="/dish/:dishId">
            <MaintenanceWrapper>
              <DishDetailPage />
            </MaintenanceWrapper>
          </Route>
          <Route path="/cart">
            <MaintenanceWrapper>
              <CartPage />
            </MaintenanceWrapper>
          </Route>
          <Route path="/checkout">
            <MaintenanceWrapper>
              <CheckoutPage />
            </MaintenanceWrapper>
          </Route>
          <Route path="/payment-callback" component={PaymentCallbackPage} />
          <Route path="/retry-payment" component={RetryPaymentPage} />
          <Route path="/order-status/:orderId" component={OrderStatusPage} />
          <Route path="/orders">
            <MaintenanceWrapper>
              <ProtectedRoute requireAuth={true}>
                <OrdersPage />
              </ProtectedRoute>
            </MaintenanceWrapper>
          </Route>
          <Route path="/order-detail/:orderId">
            <MaintenanceWrapper>
              <ProtectedRoute requireAuth={true}>
                <OrderDetailPage />
              </ProtectedRoute>
            </MaintenanceWrapper>
          </Route>
          <Route path="/canteen-order-detail/:orderId">
            <MaintenanceWrapper allowAdminAccess={true}>
              <ProtectedRoute requiredRole="canteen_owner">
                <CanteenOrderDetailPage />
              </ProtectedRoute>
            </MaintenanceWrapper>
          </Route>
          <Route path="/profile">
            <MaintenanceWrapper>
              <ProtectedRoute requireAuth={true}>
                <ProfilePage />
              </ProtectedRoute>
            </MaintenanceWrapper>
          </Route>
          <Route path="/notifications" component={NotificationsPage} />
          <Route path="/payment-methods" component={PaymentMethodsPage} />
          <Route path="/search">
            <MaintenanceWrapper>
              <SearchPage />
            </MaintenanceWrapper>
          </Route>
          <Route path="/privacy-policy" component={PrivacyPolicyPage} />
          <Route path="/terms-conditions" component={TermsConditionsPage} />
          <Route path="/canteen-owner">
            <MaintenanceWrapper allowAdminAccess={true}>
              <ProtectedRoute requiredRole="canteen_owner">
                <CanteenOwnerDashboard />
              </ProtectedRoute>
            </MaintenanceWrapper>
          </Route>
          <Route path="/canteen-owner-dashboard">
            <MaintenanceWrapper allowAdminAccess={true}>
              <ProtectedRoute requiredRole="canteen_owner">
                <CanteenOwnerDashboard />
              </ProtectedRoute>
            </MaintenanceWrapper>
          </Route>
          <Route path="/admin">
            <MaintenanceWrapper allowAdminAccess={true}>
              <ProtectedRoute requiredRoles={["admin", "super_admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            </MaintenanceWrapper>
          </Route>
          <Route path="/edit-admin-access/:userId">
            <MaintenanceWrapper allowAdminAccess={true}>
              <AdminLayout><EditAdminAccessPage /></AdminLayout>
            </MaintenanceWrapper>
          </Route>
          <Route path="/add-new-admin">
            <MaintenanceWrapper allowAdminAccess={true}>
              <AdminLayout><AddNewAdminPage /></AdminLayout>
            </MaintenanceWrapper>
          </Route>
          <Route path="/admin/analytics">
            <MaintenanceWrapper allowAdminAccess={true}>
              <AdminLayout><AdminAnalyticsPage /></AdminLayout>
            </MaintenanceWrapper>
          </Route>
          <Route path="/admin/order-management">
            <MaintenanceWrapper allowAdminAccess={true}>
              <AdminLayout><AdminOrderManagementPage /></AdminLayout>
            </MaintenanceWrapper>
          </Route>
          <Route path="/admin/menu-management">
            <MaintenanceWrapper allowAdminAccess={true}>
              <AdminLayout><AdminMenuManagementPage /></AdminLayout>
            </MaintenanceWrapper>
          </Route>
          <Route path="/admin/reports">
            <MaintenanceWrapper allowAdminAccess={true}>
              <AdminLayout><AdminReportsPage /></AdminLayout>
            </MaintenanceWrapper>
          </Route>
          <Route path="/admin/user-management">
            <MaintenanceWrapper allowAdminAccess={true}>
              <AdminLayout><AdminUserManagementPage /></AdminLayout>
            </MaintenanceWrapper>
          </Route>
          <Route path="/admin/system-settings">
            <MaintenanceWrapper allowAdminAccess={true}>
              <AdminLayout><AdminSystemSettingsPage /></AdminLayout>
            </MaintenanceWrapper>
          </Route>
          <Route path="/admin/payment-management">
            <MaintenanceWrapper allowAdminAccess={true}>
              <AdminLayout><AdminPaymentManagementPage /></AdminLayout>
            </MaintenanceWrapper>
          </Route>
          <Route path="/admin/notification-management">
            <MaintenanceWrapper allowAdminAccess={true}>
              <AdminLayout><AdminNotificationManagementPage /></AdminLayout>
            </MaintenanceWrapper>
          </Route>
          <Route path="/admin/content-management">
            <MaintenanceWrapper allowAdminAccess={true}>
              <AdminLayout><AdminContentManagementPage /></AdminLayout>
            </MaintenanceWrapper>
          </Route>
          <Route path="/admin/coupon-management">
            <MaintenanceWrapper allowAdminAccess={true}>
              <AdminLayout><AdminCouponManagement /></AdminLayout>
            </MaintenanceWrapper>
          </Route>
          <Route path="/admin/feedback-management">
            <MaintenanceWrapper allowAdminAccess={true}>
              <AdminLayout><AdminFeedbackManagementPage /></AdminLayout>
            </MaintenanceWrapper>
          </Route>
          <Route path="/admin/review-management">
            <MaintenanceWrapper allowAdminAccess={true}>
              <AdminLayout><AdminReviewManagementPage /></AdminLayout>
            </MaintenanceWrapper>
          </Route>
          <Route path="/admin/admin-access">
            <MaintenanceWrapper allowAdminAccess={true}>
              <AdminLayout><AdminAccessPage /></AdminLayout>
            </MaintenanceWrapper>
          </Route>
          <Route path="/admin/database">
            <MaintenanceWrapper allowAdminAccess={true}>
              <AdminLayout><AdminDatabasePage /></AdminLayout>
            </MaintenanceWrapper>
          </Route>
          <Route path="/admin/login-issues">
            <MaintenanceWrapper allowAdminAccess={true}>
              <AdminLayout><AdminLoginIssues /></AdminLayout>
            </MaintenanceWrapper>
          </Route>
          <Route path="/quick-picks">
            <MaintenanceWrapper>
              <ViewAllQuickPicksPage />
            </MaintenanceWrapper>
          </Route>
          <Route path="/help-support" component={HelpSupportPage} />
          <Route path="/about" component={AboutPage} />
          <Route path="/favorites">
            <MaintenanceWrapper>
              <FavoritesPage />
            </MaintenanceWrapper>
          </Route>
          <Route path="/feedback">
            <MaintenanceWrapper>
              <FeedbackPage />
            </MaintenanceWrapper>
          </Route>

          <Route path="/admin/user-management/send-email">
            <MaintenanceWrapper allowAdminAccess={true}>
              <AdminLayout><SendEmailPage /></AdminLayout>
            </MaintenanceWrapper>
          </Route>
          <Route path="/admin/user-management/add-loyalty-points">
            <MaintenanceWrapper allowAdminAccess={true}>
              <AdminLayout><AddLoyaltyPointsPage /></AdminLayout>
            </MaintenanceWrapper>
          </Route>
          <Route path="/admin/user-management/apply-discount">
            <MaintenanceWrapper allowAdminAccess={true}>
              <AdminLayout><ApplyDiscountPage /></AdminLayout>
            </MaintenanceWrapper>
          </Route>
          <Route path="/admin/user-management/send-warning">
            <MaintenanceWrapper allowAdminAccess={true}>
              <AdminLayout><SendWarningPage /></AdminLayout>
            </MaintenanceWrapper>
          </Route>
          <Route path="/admin/user-management/export-data">
            <MaintenanceWrapper allowAdminAccess={true}>
              <AdminLayout><ExportUserDataPage /></AdminLayout>
            </MaintenanceWrapper>
          </Route>
          <Route path="/admin/user-management/import-users">
            <MaintenanceWrapper allowAdminAccess={true}>
              <AdminLayout><ImportUsersPage /></AdminLayout>
            </MaintenanceWrapper>
          </Route>
          <Route path="/reorder" component={ReorderPage} />
          <Route path="/rate-review" component={RateReviewPage} />
          <Route path="/barcode-scanner" component={BarcodeScannerPage} />
          <Route path="/index" component={Index} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route component={NotFound} />
        </Switch>
        </Router>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
