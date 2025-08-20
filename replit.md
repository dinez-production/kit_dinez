# Overview
KIT-Canteen is a modern food ordering application for college campuses, designed to streamline food services and enhance the user experience for students, faculty, and staff. It provides a web-based platform for browsing menus, placing orders, and managing preferences, alongside administrative tools for canteen operators. The project aims to offer a complete, efficient solution for campus food service operations with a focus on user convenience and operational management.

# User Preferences
Preferred communication style: Simple, everyday language.
Environment variables: Always store credentials in .env file when possible for better organization.
Notification System: Replaced Firebase Cloud Messaging and OneSignal with native Web Push API using VAPID keys. This provides direct browser push notifications without third-party dependencies, better privacy, and full control over the notification system.
Session Management: Users should stay logged in until manual logout, even after app restarts or deployments. Extended session duration to 90 days for better mobile experience. Implemented cross-tab synchronization and automatic activity tracking for PWA users to maintain sessions across app switches and device interactions.
Cache Management: App should automatically clear cache on new deployments while preserving user session data.
Production Performance: SSE connections should have reconnection logic and keep-alive pings. Payment processing should have timeouts and performance monitoring. Use production-optimized scripts for deployment. Fixed duplicate registration validation and enhanced error handling.
Real-time Updates: Both "skip payment" and "pay now" orders must trigger identical real-time UI updates for canteen owners via SSE. Payment callback pages should redirect properly to order status pages after successful payment.
Staff ID Format: Changed from 6-digit numbers to 3 letters + 3 numbers format (e.g., ABC123). Staff with shorter IDs should pad with underscores for letters (_AB123) or zeros for numbers (ABC012). Updated validation and all related forms.

# System Architecture
The application features a **React-based Single Page Application (SPA)** built with **React 18** and **TypeScript**, using **Vite** for fast builds. **Wouter** handles client-side routing, and **Tailwind CSS** with **shadcn/ui** provides a consistent, mobile-first responsive design system. **TanStack Query** manages server state, while **React Hook Form** with **Zod** ensures robust form validation.

The backend is a **Node.js Express server** written in TypeScript, utilizing **ESM modules** and a middleware-based architecture. It employs an **abstract storage interface** (`IStorage`) for flexible data persistence.

A **hybrid database architecture** is used, combining **PostgreSQL with Prisma ORM** for user authentication and **MongoDB with Mongoose** for all business data (categories, menu items, orders, payments, etc.). A `HybridStorage` class provides a unified interface for seamless management of both databases.

Authentication supports **Google OAuth** and guest access, with **role-based permissions** (Student, Faculty, Staff, Admin, Super Admin) and session-based authentication offering granular admin controls. **Persistent session management** ensures users remain logged in until manual logout (up to 30 days for security). Key features include a comprehensive database schema auto-migration system, enhanced Progressive Web App (PWA) support with platform-specific optimizations, **automatic cache invalidation on deployments** with user session preservation, real-time order notifications via Server-Sent Events (SSE), and a complete counter order management system for canteen owners.

# External Dependencies
**UI and Styling:** @radix-ui, Tailwind CSS, shadcn/ui, Lucide React
**State Management & Data Fetching:** @tanstack/react-query, React Hook Form, @hookform/resolvers
**Database & ORM:** Prisma ORM (PostgreSQL), Mongoose (MongoDB), @neondatabase/serverless
**Development & Build Tools:** Vite, TypeScript, ESBuild, PostCSS, Autoprefixer
**Mobile & PWA Features:** @capacitor-community/barcode-scanner
**Payment Processing:** PhonePe Test Gateway, axios
**Push Notifications:** Native Web Push API with VAPID keys (web-push) - Replaced Firebase and OneSignal
**Utilities & Helpers:** date-fns, clsx, class-variance-authority, zod, nanoid

# Recent Changes (August 20, 2025)
- **Media Banner Management System**: Implemented comprehensive media banner system for dynamic content display
  - **GridFS Storage**: Large media files (images/videos) stored in MongoDB using GridFS for optimal performance
  - **Admin Interface**: Complete media management panel in Admin → Content Management → Media tab
  - **File Operations**: Upload, preview, activate/deactivate, and delete media files with real-time updates
  - **User Display**: MediaBanner component positioned between search bar and menu items on home screen
  - **Responsive Design**: Auto-sliding image carousels, looped video playback, mobile-optimized controls
  - **Smart Controls**: Navigation arrows and dots only appear on hover (desktop) or touch (mobile) for clean UI
  - **API Integration**: RESTful endpoints for media CRUD operations with proper error handling
- **Critical Security Fix - Session Validation**: Fixed user deletion security issue where deleted users could still access the app until clearing browser cache
  - **Problem Fixed**: When admin deleted a user, their session remained active in browser localStorage, allowing continued access
  - **Database Validation**: Added `/api/users/:id/validate` endpoint to verify user existence in database
  - **Enhanced Authentication**: Modified `useAuth` hook to validate localStorage sessions against database on app load
  - **Automatic Cleanup**: Deleted user sessions are now automatically cleared when user no longer exists in database
  - **Cross-tab Sync**: Session invalidation works across all browser tabs for better security
  - **Graceful Fallback**: If database validation fails due to network issues, keeps session temporarily for user experience

# Previous Changes (August 18, 2025)
- **Project Migration**: Successfully migrated KIT-Canteen application from Replit Agent to standard Replit environment
  - **Dependency Fix**: Resolved tsx dependency issue for TypeScript execution
  - **Startup Validation**: All databases connected successfully (MongoDB Atlas and PostgreSQL)
  - **Schema Validation**: Complete database schema validation passed
  - **Real-time Features**: SSE connections and push notifications working properly
- **Seen/Unseen Order Management**: Implemented intelligent order tracking system for canteen staff
  - **Visual Indicators**: Unseen orders display with greenish background (bg-green-50 border-green-200)
  - **Auto-Mark Seen**: Orders automatically marked as seen when clicked by staff members
  - **User-Specific Tracking**: Each order tracks which staff members have viewed it (seenBy array)
  - **Real-time Updates**: Seen/unseen status updates instantly across all connected clients
  - **Smart Workflow**: Pending orders with prep requirements show "Mark Ready" button (simplified from start preparing)
  - **API Enhancement**: Added `/api/orders/:id/mark-seen` endpoint for tracking order views
  - **Priority Queue**: Implemented priority-based sorting in prep-required orders section where unseen orders appear first
  - **Visual Priority Indicators**: Added animated "Priority" badge for unseen orders in prep-required section
- **MongoDB Transaction Compatibility Fix**: Enhanced stock management system to work across different MongoDB deployments
  - **Problem Resolved**: Fixed "Transaction numbers are only allowed on a replica set member or mongos" error occurring on production servers
  - **Smart Detection**: Added automatic MongoDB configuration detection (standalone vs replica set)
  - **Fallback Strategy**: When transactions aren't supported (standalone MongoDB), system uses atomic findOneAndUpdate operations
  - **Performance Optimization**: Cached transaction support detection to avoid repeated testing
  - **Atomic Stock Updates**: Enhanced stock deduction using MongoDB's atomic operations with stock validation
  - **Production Ready**: System now works seamlessly on both development (MongoDB Atlas) and production (standalone MongoDB) environments
  - **Backward Compatibility**: Maintains full transaction support when available while gracefully falling back

# Previous Changes (August 17, 2025)
- **Web Push API Implementation**: Completely replaced Firebase Cloud Messaging and OneSignal with native Web Push API using VAPID keys
  - Removed: Firebase messaging dependencies, OneSignal SDKs, third-party push notification services
  - Added: Native web-push library, VAPID key generation, service worker push event handling
  - Created: WebPushService class, notification routes, React hooks for subscription management
  - Benefits: No third-party dependencies, better privacy, full control, works across all modern browsers
- **Real-time Order Status Push Notifications**: Integrated push notifications with existing SSE system for comprehensive real-time updates
  - Order Status Updates: Automatic push notifications sent to customers when order status changes (confirmed, preparing, ready, completed)
  - Order Cancellation: Push notifications sent when orders are cancelled with stock restoration
  - Barcode Delivery: Push notifications sent when orders are delivered via barcode scan
  - Dual Notification System: SSE for canteen owners (real-time UI updates) + Push notifications for customers (mobile alerts)
  - Error Handling: Robust error handling ensures order updates succeed even if push notifications fail
  - Customer Targeting: Notifications automatically sent to the correct customer based on order's customerId
- **Required Environment Variables**: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL (auto-generated if missing)
- **API Endpoints**: /api/push/* for VAPID keys, subscription management, test notifications, targeted messaging