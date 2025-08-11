// MongoDB initialization script for KIT Canteen Application
// Creates application user and database with proper permissions

// Switch to kit-canteen database
db = db.getSiblingDB('kit-canteen');

// Create application user with readWrite permissions
// Note: In production, these should be set via Docker environment variables
const username = process.env.MONGODB_USER || 'kit-canteen-user';
const password = process.env.MONGODB_PASSWORD || 'kit-canteen-password';

db.createUser({
  user: username,
  pwd: password,
  roles: [
    {
      role: 'readWrite',
      db: 'kit-canteen'
    }
  ]
});

// Create indexes for optimal performance
db.categories.createIndex({ name: 1 }, { unique: true });
db.menuitems.createIndex({ name: 1 });
db.menuitems.createIndex({ categoryId: 1 });
db.menuitems.createIndex({ available: 1 });
db.menuitems.createIndex({ isTrending: 1 });

db.orders.createIndex({ orderNumber: 1 }, { unique: true });
db.orders.createIndex({ barcode: 1 }, { unique: true });
db.orders.createIndex({ customerId: 1 });
db.orders.createIndex({ status: 1 });
db.orders.createIndex({ createdAt: -1 });

db.notifications.createIndex({ createdAt: -1 });
db.notifications.createIndex({ read: 1 });

db.payments.createIndex({ merchantTransactionId: 1 }, { unique: true });
db.payments.createIndex({ orderId: 1 });
db.payments.createIndex({ status: 1 });

db.complaints.createIndex({ createdAt: -1 });
db.complaints.createIndex({ status: 1 });
db.complaints.createIndex({ userId: 1 });

db.loginissues.createIndex({ createdAt: -1 });
db.loginissues.createIndex({ status: 1 });

db.quickorders.createIndex({ position: 1 });
db.quickorders.createIndex({ isActive: 1 });

print('MongoDB initialization completed for kit-canteen database');
print('Created user: ' + username);
print('Created indexes for optimal performance');