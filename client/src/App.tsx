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
import AdminMaintenanceNoticePage from "./components/AdminMaintenanceNoticePage";
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
          <Router>
        <Switch>
          <Route path="/" component={SplashScreen} />
          <Route path="/login" component={LoginScreen} />
          <Route path="/home" component={HomeScreen} />
          <Route path="/menu/:category" component={MenuListingPage} />
          <Route path="/dish/:dishId" component={DishDetailPage} />
          <Route path="/cart" component={CartPage} />
          <Route path="/checkout" component={CheckoutPage} />
          <Route path="/payment-callback" component={PaymentCallbackPage} />
          <Route path="/retry-payment" component={RetryPaymentPage} />
          <Route path="/order-status/:orderId" component={OrderStatusPage} />
          <Route path="/orders">
            <ProtectedRoute requireAuth={true}>
              <OrdersPage />
            </ProtectedRoute>
          </Route>
          <Route path="/order-detail/:orderId">
            <ProtectedRoute requireAuth={true}>
              <OrderDetailPage />
            </ProtectedRoute>
          </Route>
          <Route path="/canteen-order-detail/:orderId">
            <ProtectedRoute requiredRole="canteen_owner">
              <CanteenOrderDetailPage />
            </ProtectedRoute>
          </Route>
          <Route path="/profile">
            <ProtectedRoute requireAuth={true}>
              <ProfilePage />
            </ProtectedRoute>
          </Route>
          <Route path="/notifications" component={NotificationsPage} />
          <Route path="/payment-methods" component={PaymentMethodsPage} />
          <Route path="/search" component={SearchPage} />
          <Route path="/privacy-policy" component={PrivacyPolicyPage} />
          <Route path="/terms-conditions" component={TermsConditionsPage} />
          <Route path="/canteen-owner">
            <ProtectedRoute requiredRole="canteen_owner">
              <CanteenOwnerDashboard />
            </ProtectedRoute>
          </Route>
          <Route path="/canteen-owner-dashboard">
            <ProtectedRoute requiredRole="canteen_owner">
              <CanteenOwnerDashboard />
            </ProtectedRoute>
          </Route>
          <Route path="/admin">
            <ProtectedRoute requiredRoles={["admin", "super_admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          </Route>
          <Route path="/edit-admin-access/:userId">
            <AdminLayout><EditAdminAccessPage /></AdminLayout>
          </Route>
          <Route path="/add-new-admin">
            <AdminLayout><AddNewAdminPage /></AdminLayout>
          </Route>
          <Route path="/admin/analytics">
            <AdminLayout><AdminAnalyticsPage /></AdminLayout>
          </Route>
          <Route path="/admin/order-management">
            <AdminLayout><AdminOrderManagementPage /></AdminLayout>
          </Route>
          <Route path="/admin/menu-management">
            <AdminLayout><AdminMenuManagementPage /></AdminLayout>
          </Route>
          <Route path="/admin/reports">
            <AdminLayout><AdminReportsPage /></AdminLayout>
          </Route>
          <Route path="/admin/user-management">
            <AdminLayout><AdminUserManagementPage /></AdminLayout>
          </Route>
          <Route path="/admin/system-settings">
            <AdminLayout><AdminSystemSettingsPage /></AdminLayout>
          </Route>
          <Route path="/admin/payment-management">
            <AdminLayout><AdminPaymentManagementPage /></AdminLayout>
          </Route>
          <Route path="/admin/notification-management">
            <AdminLayout><AdminNotificationManagementPage /></AdminLayout>
          </Route>
          <Route path="/admin/content-management">
            <AdminLayout><AdminContentManagementPage /></AdminLayout>
          </Route>
          <Route path="/admin/maintenance-notice">
            <AdminLayout><AdminMaintenanceNoticePage /></AdminLayout>
          </Route>
          <Route path="/admin/coupon-management">
            <AdminLayout><AdminCouponManagement /></AdminLayout>
          </Route>
          <Route path="/admin/feedback-management">
            <AdminLayout><AdminFeedbackManagementPage /></AdminLayout>
          </Route>
          <Route path="/admin/review-management">
            <AdminLayout><AdminReviewManagementPage /></AdminLayout>
          </Route>
          <Route path="/admin/admin-access">
            <AdminLayout><AdminAccessPage /></AdminLayout>
          </Route>
          <Route path="/admin/database">
            <AdminLayout><AdminDatabasePage /></AdminLayout>
          </Route>
          <Route path="/admin/login-issues">
            <AdminLayout><AdminLoginIssues /></AdminLayout>
          </Route>
          <Route path="/quick-picks" component={ViewAllQuickPicksPage} />
          <Route path="/help-support" component={HelpSupportPage} />
          <Route path="/about" component={AboutPage} />
          <Route path="/favorites" component={FavoritesPage} />
          <Route path="/feedback" component={FeedbackPage} />

          <Route path="/admin/user-management/send-email">
            <AdminLayout><SendEmailPage /></AdminLayout>
          </Route>
          <Route path="/admin/user-management/add-loyalty-points">
            <AdminLayout><AddLoyaltyPointsPage /></AdminLayout>
          </Route>
          <Route path="/admin/user-management/apply-discount">
            <AdminLayout><ApplyDiscountPage /></AdminLayout>
          </Route>
          <Route path="/admin/user-management/send-warning">
            <AdminLayout><SendWarningPage /></AdminLayout>
          </Route>
          <Route path="/admin/user-management/export-data">
            <AdminLayout><ExportUserDataPage /></AdminLayout>
          </Route>
          <Route path="/admin/user-management/import-users">
            <AdminLayout><ImportUsersPage /></AdminLayout>
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
