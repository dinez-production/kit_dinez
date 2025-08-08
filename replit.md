# Overview
KIT-Canteen is a modern food ordering application for college campuses, enabling students, faculty, and staff to browse menus, place orders, and manage preferences via a web application. It offers both customer-facing features and administrative panels for canteen management, aiming to provide a complete solution for campus food service operations. The project's vision is to streamline campus food services, enhance user experience, and provide efficient management tools for canteen operators.

## Recent Changes (August 2025)
- **Database Migration to Hybrid Architecture (August 7, 2025)**: Successfully migrated from PostgreSQL-only to hybrid PostgreSQL + MongoDB architecture.
  - Migrated all business data (categories, menu items, orders, payments, notifications, quick orders) to MongoDB
  - Kept user authentication data in PostgreSQL for consistency with existing auth flow
  - Implemented `HybridStorage` class managing both databases seamlessly
  - Updated error handling from PostgreSQL codes to MongoDB error codes for non-user operations
  - Maintained full API compatibility - all endpoints work exactly as before
  - Created comprehensive migration documentation and verified all data integrity
- **PhonePe Payment Gateway Integration**: Completely removed Razorpay and integrated PhonePe Test Gateway for payment processing.
  - Added comprehensive payment table to database schema with payment status tracking
  - Implemented secure PhonePe API integration with proper checksum validation
  - Created payment initiation, webhook handling, and status verification endpoints
  - Added PaymentCallbackPage component for handling payment redirects
  - Updated CheckoutPage to use PhonePe payment flow instead of Razorpay
  - Configured test environment with PhonePe sandbox credentials
  - Enhanced admin panel to show PhonePe integration status
- **Order ID Format Update**: Changed from alphanumeric format to exactly 12-digit numeric format (0-9 only) for better barcode compatibility and easier identification.
- **Order Number Highlighting**: Implemented visual highlighting of the last 4 digits of order numbers across all components for quick visual identification (e.g., 532912**9639**).
- Updated order generation in `shared/utils.ts` to use 8 random digits + 4 timestamp-based digits for uniqueness.
- Enhanced all order displays (CanteenOwnerDashboard, OrderStatusPage, BarcodeScannerPage, AdminOrderManagementPage) with highlighted last 4 digits using colored backgrounds.
- Updated barcode scanner validation to accept only 12-digit numeric format with clear error messages.
- **Real-time Order Notifications**: Implemented Server-Sent Events (SSE) for automatic order updates in canteen owner dashboard when students place orders, eliminating the need for manual page refreshes. Disabled React Query polling to prevent unnecessary API calls since real-time updates handle all order synchronization.
- Fixed "Mark Ready" button issue that was incorrectly calling menu update API instead of order update API.
- Added comprehensive error handling and duplicate prevention in barcode scanner functionality.
- **Complete User Profile System**: Fixed ProfilePage to use new UserProfileDisplay component showing complete student and staff information including register numbers, departments, staff IDs, and academic status.
- Updated AdminUserManagementPage to fetch real user data from database and display comprehensive profile information with role-specific fields.
- Fixed order ID highlighting across all components using proper `formatOrderIdDisplay` utility function.
- Enhanced profile data loading to properly handle new user schema with null-safe operations.
- **Comprehensive Offline Ordering System**: Implemented complete counter order management for canteen owners with menu browsing, shopping cart functionality, payment mode tracking (cash/online), and automatic order completion. Orders are placed under canteen owner credentials and automatically marked as "delivered" status since items are handed over immediately at counter.
- **Enhanced Order Management UI**: Reorganized orders into "Active Orders" (FIFO queue), "All Orders" (combined view), and "Offline Counter Orders" tabs. Added visual differentiation between online orders (blue badges) and counter orders (orange badges). Active orders show oldest-first priority, completed orders are sorted newest-first for easy reference.

# User Preferences
Preferred communication style: Simple, everyday language.
Environment variables: Always store credentials in .env file when possible for better organization.

# System Architecture
The application is built as a **React-based SPA** using **React 18** and **TypeScript**, with **Vite** for fast builds. **Wouter** handles client-side routing, while **Tailwind CSS** with **shadcn/ui** provides a consistent design system. **TanStack Query** manages server state, and **React Hook Form** with **Zod** ensures robust form validation. The frontend follows a component-based architecture optimized for mobile-first responsiveness.

The backend is a **Node.js Express server** written in TypeScript, leveraging **ESM modules** and a middleware-based architecture. It uses an **abstract storage interface** (`IStorage`) for flexible data persistence.

Data storage employs a **hybrid database architecture**: **PostgreSQL with Drizzle ORM** for user authentication and **MongoDB with Mongoose** for all business data (categories, menu items, orders, payments, etc.). This approach optimizes for authentication consistency while leveraging MongoDB's flexibility for complex business entities. The `HybridStorage` class provides a unified interface managing both databases seamlessly.

Authentication is **flexible**, supporting **Google OAuth** and guest access. It implements **role-based permissions** (Student, Faculty, Staff, Admin, Super Admin) and session-based authentication with granular admin controls.

# External Dependencies
**UI and Styling:** @radix-ui, Tailwind CSS, shadcn/ui, Lucide React
**State Management & Data Fetching:** @tanstack/react-query, React Hook Form, @hookform/resolvers
**Database & ORM:** Drizzle ORM (PostgreSQL), Mongoose (MongoDB), @neondatabase/serverless, Drizzle Zod
**Development & Build Tools:** Vite, TypeScript, ESBuild, PostCSS, Autoprefixer
**Mobile & PWA Features:** @capacitor-community/barcode-scanner
**Payment Processing:** PhonePe Test Gateway, axios (for payment API calls)
**Utilities & Helpers:** date-fns, clsx, class-variance-authority, zod, nanoid

# Payment Integration Details
**PhonePe Test Gateway Configuration:**
- Merchant ID: PGTESTPAYUAT86
- Test environment: https://api-preprod.phonepe.com/apis/pg-sandbox
- Secure checksum validation for all payment operations
- Webhook handling for real-time payment status updates
- Comprehensive error handling and retry mechanisms
- Payment status tracking in database with audit trail
```