import mongoose from 'mongoose';
import { MenuItem } from './models/mongodb-models';
import { storage } from './storage-hybrid';

// Environment detection for MongoDB features
let MONGODB_SUPPORTS_TRANSACTIONS: boolean | null = null;

export interface StockUpdateItem {
  id: string;
  quantity: number;
  operation: 'deduct' | 'restore';
}

export interface StockValidationResult {
  isValid: boolean;
  errors: string[];
  updates: StockUpdateItem[];
}

export class AtomicStockService {
  /**
   * Validates and prepares stock updates for order items
   */
  async validateAndPrepareStockUpdates(orderItems: any[]): Promise<StockValidationResult> {
    const errors: string[] = [];
    const updates: StockUpdateItem[] = [];

    for (const item of orderItems) {
      const menuItem = await storage.getMenuItem(item.id);
      if (!menuItem) {
        errors.push(`Item ${item.name} not found`);
        continue;
      }

      if (menuItem.stock < item.quantity) {
        errors.push(`Insufficient stock for ${item.name}. Available: ${menuItem.stock}, Requested: ${item.quantity}`);
        continue;
      }

      updates.push({
        id: item.id,
        quantity: item.quantity,
        operation: 'deduct'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      updates
    };
  }

  /**
   * Detects if MongoDB supports transactions (cached result)
   */
  private async detectTransactionSupport(): Promise<boolean> {
    if (MONGODB_SUPPORTS_TRANSACTIONS !== null) {
      return MONGODB_SUPPORTS_TRANSACTIONS;
    }

    // Force disable transactions for MongoDB 4.4 and below due to known issues
    try {
      const admin = mongoose.connection.db?.admin();
      if (admin) {
        const buildInfo = await admin.buildInfo();
        const version = buildInfo.version;
        const majorVersion = parseInt(version.split('.')[0]);
        const minorVersion = parseInt(version.split('.')[1]);
        
        if (majorVersion < 4 || (majorVersion === 4 && minorVersion <= 4)) {
          MONGODB_SUPPORTS_TRANSACTIONS = false;
          console.log(`🔄 MongoDB ${version} detected - forcing non-transactional mode for compatibility`);
          return MONGODB_SUPPORTS_TRANSACTIONS;
        }
      }
    } catch (error) {
      console.log('⚠️ Could not detect MongoDB version, proceeding with transaction test');
    }

    let session: mongoose.ClientSession | null = null;
    try {
      session = await mongoose.startSession();
      
      // Test actual transaction with a real operation using Mongoose
      await session.withTransaction(async () => {
        // Try to find a menu item within transaction to properly test
        await MenuItem.findOne({}).session(session).limit(1);
      });
      
      MONGODB_SUPPORTS_TRANSACTIONS = true;
      console.log('✅ MongoDB transactions supported (replica set detected)');
    } catch (error: any) {
      if (error.message?.includes('Transaction numbers are only allowed on a replica set') || 
          error.message?.includes('Transaction numbers') ||
          error.codeName === 'IllegalOperation' ||
          error.code === 20) {
        MONGODB_SUPPORTS_TRANSACTIONS = false;
        console.log('🔄 MongoDB transactions not supported (standalone instance detected)');
      } else {
        // For any other error, assume transactions are not supported to be safe
        MONGODB_SUPPORTS_TRANSACTIONS = false;
        console.log('🔄 MongoDB transaction detection failed, falling back to non-transactional mode:', error.message);
      }
    } finally {
      if (session) {
        await session.endSession();
      }
    }

    return MONGODB_SUPPORTS_TRANSACTIONS;
  }

  /**
   * Processes stock updates with fallback for non-replica set environments
   */
  async processStockUpdates(updates: StockUpdateItem[]): Promise<void> {
    const supportsTransactions = await this.detectTransactionSupport();

    if (supportsTransactions) {
      // Use transactions when available (replica set/sharded cluster)
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          for (const update of updates) {
            await this.updateSingleItemStock(update, session);
          }
        });
      } catch (error) {
        console.error('❌ Stock transaction failed:', error);
        throw error;
      } finally {
        await session.endSession();
      }
    } else {
      // Fallback to sequential updates for standalone MongoDB
      console.log('🔄 Using sequential stock updates (standalone MongoDB)');
      for (const update of updates) {
        await this.updateSingleItemStock(update, null);
      }
    }
  }

  /**
   * Updates stock for a single item with optional session using atomic operations
   */
  private async updateSingleItemStock(update: StockUpdateItem, session: mongoose.ClientSession | null): Promise<void> {
    // For deduction, use atomic findOneAndUpdate with stock validation
    if (update.operation === 'deduct') {
      let result;
      
      if (session) {
        // Use session when transactions are supported
        result = await MenuItem.findOneAndUpdate(
          { 
            _id: update.id, 
            stock: { $gte: update.quantity } // Ensure sufficient stock atomically
          },
          { $inc: { stock: -update.quantity } },
          { session, new: true }
        );
      } else {
        // Direct operation without session for standalone MongoDB
        result = await MenuItem.findOneAndUpdate(
          { 
            _id: update.id, 
            stock: { $gte: update.quantity } // Ensure sufficient stock atomically
          },
          { $inc: { stock: -update.quantity } },
          { new: true }
        );
      }

      if (!result) {
        // Check if item exists or if it's a stock issue
        const menuItem = await MenuItem.findById(update.id);
        if (!menuItem) {
          throw new Error(`Menu item ${update.id} not found during stock update`);
        } else {
          throw new Error(`Insufficient stock for item ${update.id}. Available: ${menuItem.stock}, Requested: ${update.quantity}`);
        }
      }

      console.log(`📦 Stock deducted for item ${update.id}: ${result.stock + update.quantity} → ${result.stock} (${update.quantity} deducted)`);
    } 
    // For restoration, use simple increment
    else if (update.operation === 'restore') {
      let result;
      
      if (session) {
        // Use session when transactions are supported
        result = await MenuItem.findByIdAndUpdate(
          update.id,
          { $inc: { stock: update.quantity } },
          { session, new: true }
        );
      } else {
        // Direct operation without session for standalone MongoDB
        result = await MenuItem.findByIdAndUpdate(
          update.id,
          { $inc: { stock: update.quantity } },
          { new: true }
        );
      }

      if (!result) {
        throw new Error(`Menu item ${update.id} not found during stock restoration`);
      }

      console.log(`📦 Stock restored for item ${update.id}: ${result.stock - update.quantity} → ${result.stock} (${update.quantity} restored)`);
    } else {
      throw new Error(`Invalid stock operation: ${update.operation}`);
    }
  }

  /**
   * Processes an order with atomic stock management
   */
  async processOrderWithStockManagement(orderData: any, orderItems: any[]): Promise<any> {
    // Step 1: Validate stock availability
    const validation = await this.validateAndPrepareStockUpdates(orderItems);
    if (!validation.isValid) {
      throw new Error(`Stock validation failed: ${validation.errors.join(', ')}`);
    }

    // Step 2: Process stock updates atomically
    await this.processStockUpdates(validation.updates);

    // Step 3: Create the order
    try {
      const order = await storage.createOrder(orderData);
      console.log(`✅ Order ${order.orderNumber} created successfully with atomic stock management`);
      return order;
    } catch (error) {
      // Step 4: If order creation fails, restore stock
      console.error('❌ Order creation failed, restoring stock...');
      const restoreUpdates = validation.updates.map(update => ({
        ...update,
        operation: 'restore' as const
      }));
      
      try {
        await this.processStockUpdates(restoreUpdates);
        console.log('✅ Stock restored after order creation failure');
      } catch (restoreError) {
        console.error('❌ Failed to restore stock after order creation failure:', restoreError);
        // Log this critical error but don't throw to preserve original error
      }
      
      throw error;
    }
  }

  /**
   * Restores stock for a cancelled order
   */
  async restoreStockForOrder(orderId: string): Promise<void> {
    const order = await storage.getOrder(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    let orderItems: any[];
    try {
      orderItems = JSON.parse(order.items);
    } catch (error) {
      throw new Error(`Invalid order items format for order ${orderId}`);
    }

    const restoreUpdates: StockUpdateItem[] = orderItems.map(item => ({
      id: item.id,
      quantity: item.quantity,
      operation: 'restore'
    }));

    await this.processStockUpdates(restoreUpdates);
    console.log(`✅ Stock restored for cancelled order ${order.orderNumber}`);
  }

  /**
   * Gets current stock status for multiple items
   */
  async getStockStatus(itemIds: string[]): Promise<Array<{id: string, stock: number, available: boolean}>> {
    const stockStatus = [];
    
    for (const itemId of itemIds) {
      const menuItem = await storage.getMenuItem(itemId);
      if (menuItem) {
        stockStatus.push({
          id: itemId,
          stock: menuItem.stock,
          available: menuItem.available && menuItem.stock > 0
        });
      }
    }

    return stockStatus;
  }
}

export const stockService = new AtomicStockService();