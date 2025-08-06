# Overview
KIT-Canteen is a modern food ordering application for college campuses, enabling students, faculty, and staff to browse menus, place orders, and manage preferences via a web application. It offers both customer-facing features and administrative panels for canteen management, aiming to provide a complete solution for campus food service operations. The project's vision is to streamline campus food services, enhance user experience, and provide efficient management tools for canteen operators.

## Recent Changes (August 2025)
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
- **Real-time Order Notifications**: Implemented Server-Sent Events (SSE) for automatic order updates in canteen owner dashboard when students place orders, eliminating the need for manual page refreshes.
- Fixed "Mark Ready" button issue that was incorrectly calling menu update API instead of order update API.
- Added comprehensive error handling and duplicate prevention in barcode scanner functionality.
- **Complete User Profile System**: Fixed ProfilePage to use new UserProfileDisplay component showing complete student and staff information including register numbers, departments, staff IDs, and academic status.
- Updated AdminUserManagementPage to fetch real user data from database and display comprehensive profile information with role-specific fields.
- Fixed order ID highlighting across all components using proper `formatOrderIdDisplay` utility function.
- Enhanced profile data loading to properly handle new user schema with null-safe operations.

# User Preferences
Preferred communication style: Simple, everyday language.
Environment variables: Always store credentials in .env file when possible for better organization.

# System Architecture
The application is built as a **React-based SPA** using **React 18** and **TypeScript**, with **Vite** for fast builds. **Wouter** handles client-side routing, while **Tailwind CSS** with **shadcn/ui** provides a consistent design system. **TanStack Query** manages server state, and **React Hook Form** with **Zod** ensures robust form validation. The frontend follows a component-based architecture optimized for mobile-first responsiveness.

The backend is a **Node.js Express server** written in TypeScript, leveraging **ESM modules** and a middleware-based architecture. It uses an **abstract storage interface** (`IStorage`) for flexible data persistence.

Data storage employs a **dual approach**: in-memory storage (`MemStorage`) for development and **PostgreSQL with Drizzle ORM** for production, ensuring type-safe database operations. Database migrations are managed via Drizzle Kit, adhering to a schema-first approach.

Authentication is **flexible**, supporting **Google OAuth** and guest access. It implements **role-based permissions** (Student, Faculty, Staff, Admin, Super Admin) and session-based authentication with granular admin controls.

# External Dependencies
**UI and Styling:** @radix-ui, Tailwind CSS, shadcn/ui, Lucide React
**State Management & Data Fetching:** @tanstack/react-query, React Hook Form, @hookform/resolvers
**Database & ORM:** Drizzle ORM, @neondatabase/serverless, Drizzle Zod
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