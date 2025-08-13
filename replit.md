# Overview
KIT-Canteen is a modern food ordering application for college campuses, designed to streamline food services and enhance the user experience for students, faculty, and staff. It provides a web-based platform for browsing menus, placing orders, and managing preferences, alongside administrative tools for canteen operators. The project aims to offer a complete, efficient solution for campus food service operations with a focus on user convenience and operational management.

# User Preferences
Preferred communication style: Simple, everyday language.
Environment variables: Always store credentials in .env file when possible for better organization.
Production builds: Use custom build script (`node scripts/build.js`) to ensure Firebase environment variables are properly embedded during Vite build process.
Session Management: Users should stay logged in until manual logout, even after app restarts or deployments. Extended session duration to 90 days for better mobile experience.
Cache Management: App should automatically clear cache on new deployments while preserving user session data.
Production Performance: SSE connections should have reconnection logic and keep-alive pings. Payment processing should have timeouts and performance monitoring. Use production-optimized scripts for deployment. Fixed duplicate registration validation and enhanced error handling.
Real-time Updates: Both "skip payment" and "pay now" orders must trigger identical real-time UI updates for canteen owners via SSE. Payment callback pages should redirect properly to order status pages after successful payment.

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
**Utilities & Helpers:** date-fns, clsx, class-variance-authority, zod, nanoid