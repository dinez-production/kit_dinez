# Database Migration Guide: PostgreSQL to MongoDB

## Overview
This document outlines the migration from a PostgreSQL-only setup to a hybrid PostgreSQL + MongoDB architecture for the Canteen Ordering System.

## Migration Summary
- **Date**: August 7, 2025
- **Migration Type**: Partial (Hybrid Architecture)
- **Status**: ✅ Completed Successfully

## Architecture Changes

### Before Migration
- **Single Database**: PostgreSQL (via Prisma)
- **All Data**: Users, Categories, MenuItems, Orders, Payments, etc.

### After Migration
- **Hybrid Setup**: PostgreSQL + MongoDB
- **PostgreSQL**: User authentication data only
- **MongoDB**: All business data (Categories, MenuItems, Orders, Payments, etc.)

## Database Distribution

### PostgreSQL (Authentication Data)
```
📊 Tables Remaining:
└── users (6 records) - ONLY TABLE IN POSTGRESQL
    ├── id, email, name, phoneNumber
    ├── role, registerNumber, department
    ├── joiningYear, passingOutYear, currentStudyYear
    ├── isPassed, staffId, isProfileComplete
    └── createdAt
    
📊 Constraints: users_pkey, users_email_key, users_register_number_key, users_staff_id_key
📊 Indexes: 4 user-related indexes only
```

### MongoDB (Business Data)
```
📊 Collections Created:
├── categories (4 documents)
├── menuItems (3 documents)  
├── orders (34 documents)
├── orderItems (0 documents)
├── notifications (0 documents)
├── loginIssues (0 documents)
├── quickOrders (1 document)
└── payments (26 documents)
```

## Migration Process

### 1. Data Export & Import
- ✅ Exported all non-user data from PostgreSQL
- ✅ Imported data to MongoDB with proper ID mapping
- ✅ Maintained data relationships using ObjectId references
- ✅ Preserved PostgreSQL user IDs in MongoDB for cross-database references

### 2. Schema Updates
- ✅ Updated Prisma schema to include only User model
- ✅ Updated TypeScript types in `shared/schema.ts`
- ✅ Maintained backward compatibility for existing APIs

### 3. Database Cleanup
- ✅ Removed unnecessary PostgreSQL tables:
  - categories, menu_items, orders, order_items
  - notifications, login_issues, quick_orders, payments
  - pending_orders
- ✅ Updated foreign key constraints
- ✅ Ran Prisma database push to sync schema
- ✅ Verified only `users` table remains in PostgreSQL
- ✅ Confirmed all indexes and constraints are clean

## Code Changes

### Files Updated
1. **`prisma/schema.prisma`**: Removed all models except User
2. **`shared/schema.ts`**: Updated type definitions for hybrid setup
3. **Database operations**: Already handled by `HybridStorage` class

### Storage Architecture
The application uses `HybridStorage` class (`server/storage-hybrid.ts`) which:
- **PostgreSQL operations**: User authentication and profile management
- **MongoDB operations**: All business logic (menu, orders, payments)
- **Cross-database references**: Orders store PostgreSQL user IDs

## Data Integrity Verification

### Migration Results
```
✅ Categories: 4 → 4 (100% migrated)
✅ Menu Items: 3 → 3 (100% migrated) 
✅ Orders: 34 → 34 (100% migrated)
✅ Order Items: 0 → 0 (100% migrated)
✅ Notifications: 0 → 0 (100% migrated)
✅ Login Issues: 0 → 0 (100% migrated)
✅ Quick Orders: 1 → 1 (100% migrated)
✅ Payments: 26 → 26 (100% migrated)
✅ Users: 6 (remained in PostgreSQL)
```

### API Verification
All endpoints tested and working:
- ✅ `GET /api/users/by-email/:email` (PostgreSQL)
- ✅ `GET /api/categories` (MongoDB)
- ✅ `GET /api/menu` (MongoDB)
- ✅ `GET /api/quick-orders` (MongoDB)

## Benefits of Hybrid Architecture

### PostgreSQL for Users
- **ACID compliance** for authentication data
- **Strong consistency** for user profiles
- **Mature ecosystem** for auth/security features
- **SQL capabilities** for complex user queries

### MongoDB for Business Data
- **Flexible schema** for dynamic menu items
- **Better performance** for read-heavy operations
- **Horizontal scaling** for order data
- **JSON-native** for complex order structures

## Maintenance Notes

### Environment Variables Required
```bash
DATABASE_URL=postgresql://...  # PostgreSQL connection
MONGODB_URI=mongodb+srv://...  # MongoDB Atlas connection
```

### Backup Strategy
- **PostgreSQL**: User data backup via pg_dump
- **MongoDB**: Business data backup via mongodump
- **Cross-references**: Document user ID mappings

### Future Considerations
- Consider migrating user sessions to Redis for better performance
- Monitor cross-database query performance
- Plan for eventual MongoDB sharding if order volume grows

## Troubleshooting

### Common Issues
1. **Connection Problems**: Verify both DATABASE_URL and MONGODB_URI
2. **Missing Data**: Check HybridStorage implementation
3. **ID Mismatches**: Ensure user IDs in MongoDB orders match PostgreSQL

### Health Checks
The application performs startup health checks for both databases:
```
✅ MongoDB Atlas connection successful
✅ PostgreSQL connection successful
```

## Rollback Plan (If Needed)
1. **Emergency**: Use Replit rollback feature to restore previous state
2. **Manual**: 
   - Restore PostgreSQL from backup
   - Clear MongoDB collections
   - Revert code changes

---

**Migration Completed**: August 7, 2025  
**Next Review**: 30 days post-migration  
**Status**: Production Ready ✅