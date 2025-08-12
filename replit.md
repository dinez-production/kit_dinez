# Overview
KIT-Canteen is a modern food ordering application for college campuses, designed to streamline food services and enhance the user experience for students, faculty, and staff. It provides a web-based platform for browsing menus, placing orders, and managing preferences, alongside administrative tools for canteen operators. The project aims to offer a complete, efficient solution for campus food service operations with a focus on user convenience and operational management.

# User Preferences
Preferred communication style: Simple, everyday language.
Environment variables: Always store credentials in .env file when possible for better organization.

## Recent Changes (August 2025)
- **Docker-Based Dual Database Architecture (August 12, 2025)**: Implemented production-ready Docker development environment with PostgreSQL and MongoDB containers.
  - **Dual Prisma Setup**: Separate schemas for PostgreSQL (`prisma/postgres/schema.prisma`) and MongoDB (`prisma/mongodb/schema.prisma`)
  - **Docker Compose**: Complete container orchestration with persistent volumes and health checks
  - **Automated Scripts**: Comprehensive backup, migration, and deployment automation
  - **Production-Ready Deployment**: Safe, repeatable deployment process with pre/post validation
  - **Data Migration Framework**: Idempotent MongoDB migration scripts with batch processing
  - **Environment Management**: Separate development and production configurations
  - **Database Clients**: Type-safe clients for both PostgreSQL and MongoDB operations

# System Architecture
The application features a **React-based Single Page Application (SPA)** built with **React 18** and **TypeScript**, using **Vite** for fast builds. **Wouter** handles client-side routing, and **Tailwind CSS** with **shadcn/ui** provides a consistent, mobile-first responsive design system. **TanStack Query** manages server state, while **React Hook Form** with **Zod** ensures robust form validation.

The backend is a **Node.js Express server** written in TypeScript, utilizing **ESM modules** and a middleware-based architecture. It employs an **abstract storage interface** (`IStorage`) for flexible data persistence.

A **dual database architecture** is implemented with **PostgreSQL using Prisma ORM** for user authentication and relational data, and **MongoDB using Prisma ORM** for business data (categories, menu items, orders, payments, etc.). Two separate Prisma schemas and clients provide type-safe database operations across both systems.

Authentication supports **Google OAuth** and guest access, with **role-based permissions** (Student, Faculty, Staff, Admin, Super Admin) and session-based authentication offering granular admin controls. Key features include a comprehensive database schema auto-migration system, enhanced Progressive Web App (PWA) support with platform-specific optimizations, real-time order notifications via Server-Sent Events (SSE), and a complete counter order management system for canteen owners.

# External Dependencies
**UI and Styling:** @radix-ui, Tailwind CSS, shadcn/ui, Lucide React
**State Management & Data Fetching:** @tanstack/react-query, React Hook Form, @hookform/resolvers
**Database & ORM:** Dual Prisma ORM setup (PostgreSQL + MongoDB), MongoDB driver, @neondatabase/serverless
**Development & Build Tools:** Vite, TypeScript, ESBuild, PostCSS, Autoprefixer
**Mobile & PWA Features:** @capacitor-community/barcode-scanner
**Payment Processing:** PhonePe Test Gateway, axios
**Utilities & Helpers:** date-fns, clsx, class-variance-authority, zod, nanoid