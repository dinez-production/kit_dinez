import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage-hybrid";
import { 
  insertUserSchema, 
  insertCategorySchema, 
  insertMenuItemSchema, 
  insertOrderSchema, 
  insertNotificationSchema,
  insertLoginIssueSchema,
  insertQuickOrderSchema,
  insertPaymentSchema,
  insertComplaintSchema
} from "@shared/schema";
import { generateOrderNumber } from "@shared/utils";
import { 
  PHONEPE_CONFIG, 
  getOAuthToken,
  createOAuthPaymentPayload,
  generatePaymentChecksum, 
  generateStatusChecksum, 
  verifyWebhookChecksum, 
  createPaymentPayload,
  PAYMENT_STATUS,
  PHONEPE_RESPONSE_CODES
} from "@shared/phonepe";
import { healthCheckHandler } from "./health-check";
import { SimpleSchemaValidator } from "./migrations/simple-schema-check";
import { stockService } from "./stock-service";
import { webPushService } from "./services/webPushService.js";
import webPushRoutes from "./routes/webPush.js";
import axios from "axios";

// Store SSE connections for real-time notifications
const sseConnections = new Set<any>();

// Global server start time for development update detection
const SERVER_START_TIME = Date.now();

// Performance optimization: Cache payment status API failures to avoid repeated slow calls
const paymentStatusCache = new Map<string, { 
  lastAttempt: number; 
  consecutiveFailures: number; 
  shouldSkipApi: boolean;
}>();
const API_RETRY_INTERVAL = 30000; // 30 seconds before retrying failed API calls
const MAX_CONSECUTIVE_FAILURES = 3; // Skip API after 3 consecutive failures

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint with comprehensive database status
  app.get("/api/health", healthCheckHandler);

  // Simple health check endpoint for quick status
  app.get("/api/status", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Server info endpoint for development update detection
  app.get("/api/server-info", (req, res) => {
    res.json({
      startTime: SERVER_START_TIME,
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // Database schema health check endpoint
  app.get("/api/schema-status", async (req, res) => {
    try {
      const validator = new SimpleSchemaValidator();
      const status = await validator.getSchemaStatus();
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        schema: status
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Schema status check failed"
      });
    }
  });

  // MongoDB transaction diagnostics endpoint
  app.get("/api/mongodb-diagnostics", async (req, res) => {
    try {
      const mongoose = require('mongoose');
      
      // Get MongoDB version and configuration
      const admin = mongoose.connection.db?.admin();
      let mongoInfo: {
        connected: boolean;
        version: string;
        serverStatus: any;
      } = {
        connected: mongoose.connection.readyState === 1,
        version: 'unknown',
        serverStatus: 'unknown'
      };

      if (admin) {
        try {
          const buildInfo = await admin.buildInfo();
          mongoInfo.version = buildInfo.version;
          
          const serverStatus = await admin.serverStatus();
          mongoInfo.serverStatus = {
            host: serverStatus.host,
            version: serverStatus.version,
            process: serverStatus.process,
            repl: serverStatus.repl || null
          };
        } catch (error) {
          mongoInfo.serverStatus = `Error: ${error instanceof Error ? error.message : 'Unknown'}`;
        }
      }

      // Test transaction support using the stockService
      let transactionTest: {
        supported: boolean;
        error: string | null;
        testPerformed: boolean;
      } = {
        supported: false,
        error: null,
        testPerformed: false
      };

      try {
        // Reset the cached value to force a fresh test
        const stockServiceModule = require('./stock-service');
        if (stockServiceModule.stockService) {
          // Access private method through a test call
          transactionTest.testPerformed = true;
          // This will trigger the detectTransactionSupport method
          await stockServiceModule.stockService.validateAndPrepareStockUpdates([]);
        }
      } catch (error) {
        transactionTest.error = error instanceof Error ? error.message : 'Unknown error';
      }

      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        mongodb: mongoInfo,
        transactionSupport: transactionTest,
        recommendation: mongoInfo.version.startsWith('4.4') ? 
          'MongoDB 4.4 detected - using non-transactional mode for compatibility' :
          'Version compatible with transactions if replica set is configured'
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "MongoDB diagnostics failed"
      });
    }
  });

  // Server-Sent Events endpoint for real-time order notifications
  app.get("/api/events/orders", (req, res) => {
    // Set headers for SSE with production optimizations
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering for SSE
      'Content-Encoding': 'identity' // Prevent compression for SSE
    });

    // Add connection to the set
    sseConnections.add(res);
    
    // Send initial connection confirmation
    res.write('data: {"type": "connected", "message": "Connected to real-time order updates"}\n\n');
    
    console.log(`📡 SSE client connected. Total connections: ${sseConnections.size}`);

    // Set up keep-alive ping to prevent connection timeout in production
    const keepAliveInterval = setInterval(() => {
      try {
        if (res.writable && !res.destroyed) {
          res.write('data: {"type": "ping"}\n\n');
        } else {
          clearInterval(keepAliveInterval);
          sseConnections.delete(res);
        }
      } catch (error) {
        console.warn('📡 SSE keep-alive failed:', error instanceof Error ? error.message : 'Unknown error');
        clearInterval(keepAliveInterval);
        sseConnections.delete(res);
      }
    }, 25000); // Send ping every 25 seconds for better reliability

    // Handle client disconnect
    req.on('close', () => {
      clearInterval(keepAliveInterval);
      sseConnections.delete(res);
      console.log(`📡 SSE client disconnected. Total connections: ${sseConnections.size}`);
    });

    // Handle connection errors
    req.on('error', () => {
      clearInterval(keepAliveInterval);
      sseConnections.delete(res);
    });
  });

  // User management endpoints
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(parseInt(req.params.id));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check for duplicate email first
      const existingEmailUser = await storage.getUserByEmail(validatedData.email);
      if (existingEmailUser) {
        return res.status(409).json({ message: "Email is already registered" });
      }
      
      // Check for duplicate register number if student (case-insensitive)
      if (validatedData.role === "student" && validatedData.registerNumber) {
        const normalizedRegisterNumber = validatedData.registerNumber.toUpperCase();
        const existingRegisterUser = await storage.getUserByRegisterNumber(normalizedRegisterNumber);
        if (existingRegisterUser) {
          return res.status(409).json({ message: "Register number is already registered" });
        }
      }
      
      // Check for duplicate staff ID if staff (case-insensitive)
      if (validatedData.role === "staff" && validatedData.staffId) {
        const normalizedStaffId = validatedData.staffId.toUpperCase();
        const existingStaffUser = await storage.getUserByStaffId(normalizedStaffId);
        if (existingStaffUser) {
          return res.status(409).json({ message: "Staff ID is already registered" });
        }
      }
      
      const user = await storage.createUser(validatedData);
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/by-email/:email", async (req, res) => {
    try {
      const user = await storage.getUserByEmail(req.params.email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/by-register/:registerNumber", async (req, res) => {
    try {
      // Normalize register number for case-insensitive lookup
      const normalizedRegisterNumber = req.params.registerNumber.toUpperCase();
      const user = await storage.getUserByRegisterNumber(normalizedRegisterNumber);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/by-staff/:staffId", async (req, res) => {
    try {
      // Normalize staff ID for case-insensitive lookup
      const normalizedStaffId = req.params.staffId.toUpperCase();
      const user = await storage.getUserByStaffId(normalizedStaffId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if email is already taken by another user
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({ message: "Email is already in use by another account" });
      }

      const updatedUser = await storage.updateUserEmail(userId, email);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      console.log(`🔄 Updating user ${userId} with data:`, JSON.stringify(req.body, null, 2));
      
      const user = await storage.updateUser(userId, req.body);
      console.log(`✅ User ${userId} updated successfully:`, JSON.stringify(user, null, 2));
      
      res.json(user);
    } catch (error: any) {
      console.error("❌ Error updating user:", error);
      res.status(500).json({ message: "Internal server error", error: error?.message || String(error) });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      console.log(`🗑️ Attempting to delete user ${userId}`);
      
      // Check if user exists first
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        console.log(`❌ User ${userId} not found for deletion`);
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log(`📋 Deleting user: ${existingUser.name} (${existingUser.email})`);
      await storage.deleteUser(userId);
      console.log(`✅ User ${userId} deleted successfully from database`);
      
      res.json({ message: "User deleted successfully" });
    } catch (error: any) {
      console.error("❌ Error deleting user:", error);
      res.status(500).json({ message: "Internal server error", error: error?.message || String(error) });
    }
  });

  app.delete("/api/users/all", async (req, res) => {
    try {
      await storage.deleteAllUsers();
      res.json({ message: "All users deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User details endpoints for admin panel
  app.get("/api/users/:id/orders", async (req, res) => {
    try {
      const orders = await storage.getUserOrders(parseInt(req.params.id));
      res.json(orders);
    } catch (error) {
      console.error("Error fetching user orders:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/:id/payments", async (req, res) => {
    try {
      const payments = await storage.getUserPayments(parseInt(req.params.id));
      res.json(payments);
    } catch (error) {
      console.error("Error fetching user payments:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/:id/complaints", async (req, res) => {
    try {
      const complaints = await storage.getComplaintsByUser(parseInt(req.params.id));
      res.json(complaints);
    } catch (error) {
      console.error("Error fetching user complaints:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/users/:id/block", async (req, res) => {
    try {
      const user = await storage.blockUser(parseInt(req.params.id));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "User blocked successfully", user });
    } catch (error) {
      console.error("Error blocking user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/users/:id/unblock", async (req, res) => {
    try {
      const user = await storage.unblockUser(parseInt(req.params.id));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "User unblocked successfully", user });
    } catch (error) {
      console.error("Error unblocking user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Categories endpoints
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const validatedData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(validatedData);
      res.status(201).json(category);
    } catch (error: any) {
      if (error.code === 11000 || error.message?.includes('E11000')) { // MongoDB duplicate key error
        res.status(409).json({ message: "Category already exists" });
      } else {
        res.status(500).json({ message: "Internal server error", error: error.message });
      }
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      await storage.deleteCategory(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Menu Items endpoints
  app.get("/api/menu", async (req, res) => {
    try {
      const menuItems = await storage.getMenuItems();
      res.json(menuItems);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/menu/:id", async (req, res) => {
    try {
      const menuItem = await storage.getMenuItem(req.params.id);
      if (!menuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      res.json(menuItem);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/menu", async (req, res) => {
    try {
      const validatedData = insertMenuItemSchema.parse(req.body);
      // Convert categoryId to string if it exists
      const menuItemData = {
        ...validatedData,
        categoryId: validatedData.categoryId ? validatedData.categoryId.toString() : undefined
      };
      const menuItem = await storage.createMenuItem(menuItemData);
      res.status(201).json(menuItem);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/menu/:id", async (req, res) => {
    try {
      console.log("PUT /api/menu/:id - Request body:", req.body);
      
      // Validate the request data, but allow partial updates
      const validatedData = insertMenuItemSchema.partial().parse(req.body);
      console.log("PUT /api/menu/:id - Validated data:", validatedData);
      
      // Convert categoryId to string if it exists
      const updateData = {
        ...validatedData,
        categoryId: validatedData.categoryId ? validatedData.categoryId.toString() : undefined
      };
      const menuItem = await storage.updateMenuItem(req.params.id, updateData);
      res.json(menuItem);
    } catch (error) {
      console.error("Error updating menu item:", error);
      res.status(500).json({ message: "Internal server error", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.delete("/api/menu/:id", async (req, res) => {
    try {
      await storage.deleteMenuItem(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Orders endpoints
  app.get("/api/orders", async (req, res) => {
    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/orders/paginated", async (req, res) => {
    try {
      console.log("📋 Fetching paginated orders...");
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 15;
      
      console.log(`📋 Pagination params: page=${page}, limit=${limit}`);
      
      const result = await storage.getOrdersPaginated(page, limit);
      console.log(`📋 Fetched ${result.orders.length} orders, total: ${result.totalCount}`);
      
      res.json(result);
    } catch (error) {
      console.error("❌ Error fetching paginated orders:", error);
      res.status(500).json({ 
        message: "Internal server error", 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/orders/active/paginated", async (req, res) => {
    try {
      console.log("📋 Fetching paginated active orders...");
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 15;
      
      console.log(`📋 Active orders pagination params: page=${page}, limit=${limit}`);
      
      const result = await storage.getActiveOrdersPaginated(page, limit);
      console.log(`📋 Fetched ${result.orders.length} active orders, total: ${result.totalCount}`);
      
      res.json(result);
    } catch (error) {
      console.error("❌ Error fetching paginated active orders:", error);
      res.status(500).json({ 
        message: "Internal server error", 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Search orders across all data (server-side search)
  app.get("/api/orders/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 15;
      
      if (!query || query.trim().length === 0) {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      console.log(`🔍 Searching orders with query: "${query}", page=${page}, limit=${limit}`);
      
      const result = await storage.searchOrders(query.trim(), page, limit);
      console.log(`🔍 Found ${result.orders.length} orders matching "${query}", total: ${result.totalCount}`);
      
      res.json(result);
    } catch (error) {
      console.error("❌ Error searching orders:", error);
      res.status(500).json({ 
        message: "Internal server error", 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      // Generate unique 12-digit numeric order ID for both orderNumber and barcode
      const orderNumber = generateOrderNumber();
      const barcode = generateOrderNumber();
      
      const orderData = { ...req.body, orderNumber, barcode };
      const validatedData = insertOrderSchema.parse(orderData);
      
      // Parse order items
      let orderItems = [];
      try {
        orderItems = JSON.parse(validatedData.items);
      } catch (error) {
        return res.status(400).json({ message: "Invalid order items format" });
      }

      // Check markable status for order status determination
      let hasMarkableItem = false;
      for (const item of orderItems) {
        const menuItem = await storage.getMenuItem(item.id);
        if (menuItem && menuItem.isMarkable) {
          hasMarkableItem = true;
          break;
        }
      }
      
      // Determine order status based on markable items (unless it's a counter order)
      let orderStatus;
      if (validatedData.isCounterOrder) {
        // For counter orders, keep the original status sent from client (usually "delivered")
        orderStatus = validatedData.status || "delivered";
      } else {
        // For regular orders, determine status based on markable items
        orderStatus = hasMarkableItem ? "pending" : "ready";
      }
      
      // Update validated data with appropriate status
      const finalOrderData = {
        ...validatedData,
        status: orderStatus
      };
      
      console.log(`🔄 Order ${orderNumber}: ${hasMarkableItem ? 'Has markable items - status: pending' : 'All non-markable items - status: ready'}`);
      
      // Process order with atomic stock management
      const order = await stockService.processOrderWithStockManagement(finalOrderData, orderItems);
      
      // Broadcast new order to all connected SSE clients (canteen owners) with error handling
      if (sseConnections.size > 0) {
        const message = `data: ${JSON.stringify({
          type: 'new_order',
          data: order
        })}\n\n`;
        
        console.log(`📡 Broadcasting new order to ${sseConnections.size} SSE connections:`, {
          orderNumber: order.orderNumber,
          messageType: 'new_order'
        });
        
        // Send to all connected SSE clients with improved error handling
        const deadConnections = new Set();
        sseConnections.forEach((connection) => {
          try {
            if (connection.writable && !connection.destroyed) {
              connection.write(message);
              console.log('📤 Message sent to SSE client');
            } else {
              console.log('📡 Removing dead SSE connection');
              deadConnections.add(connection);
            }
          } catch (error) {
            console.warn('📡 SSE connection error during broadcast:', error instanceof Error ? error.message : 'Unknown error');
            deadConnections.add(connection);
          }
        });
        
        // Clean up dead connections
        deadConnections.forEach(conn => sseConnections.delete(conn));
        
        console.log(`📢 Successfully broadcasted new order ${order.orderNumber} to ${sseConnections.size} active clients`);
      } else {
        console.log('📡 No SSE connections available for broadcast');
      }
      
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      if (error instanceof Error && error.message.includes('Stock validation failed')) {
        return res.status(400).json({ 
          message: "Order cannot be processed due to stock issues",
          errors: [error.message]
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Order cancellation endpoint with stock restoration
  app.post("/api/orders/:id/cancel", async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Check if order can be cancelled
      if (order.status === 'delivered' || order.status === 'cancelled') {
        return res.status(400).json({ 
          message: `Cannot cancel order with status: ${order.status}` 
        });
      }

      // Restore stock for the cancelled order
      await stockService.restoreStockForOrder(req.params.id);

      // Update order status to cancelled
      const updatedOrder = await storage.updateOrder(req.params.id, { 
        status: 'cancelled',
        deliveredAt: new Date() // Track cancellation time
      });

      // Send push notification to customer about cancellation
      try {
        const customer = await storage.getUser(order.customerId);
        if (customer) {
          await webPushService.sendOrderUpdate(
            customer.id.toString(),
            order.orderNumber,
            "cancelled",
            `Your order #${order.orderNumber} has been cancelled. If you have any questions, please contact us.`
          );
          console.log(`🔔 Cancellation notification sent to customer ${customer.email} for order ${order.orderNumber}`);
        }
      } catch (pushError) {
        console.error(`❌ Failed to send cancellation notification for order ${order.orderNumber}:`, pushError instanceof Error ? pushError.message : 'Unknown push notification error');
      }

      // Broadcast cancellation to SSE clients
      if (sseConnections.size > 0) {
        const message = `data: ${JSON.stringify({
          type: 'order_cancelled',
          data: updatedOrder
        })}\n\n`;
        
        sseConnections.forEach((connection) => {
          try {
            if (connection.writable && !connection.destroyed) {
              connection.write(message);
            }
          } catch (error) {
            console.warn('📡 SSE connection error during cancellation broadcast:', error instanceof Error ? error.message : 'Unknown error');
          }
        });
      }

      console.log(`🚫 Order ${order.orderNumber} cancelled and stock restored`);
      res.json({ 
        message: "Order cancelled successfully", 
        order: updatedOrder 
      });
    } catch (error) {
      console.error("Error cancelling order:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Stock status endpoint
  app.get("/api/stock/status", async (req, res) => {
    try {
      const { itemIds } = req.query;
      if (!itemIds) {
        return res.status(400).json({ message: "itemIds query parameter is required" });
      }
      
      const ids = Array.isArray(itemIds) ? itemIds : [itemIds];
      const stockStatus = await stockService.getStockStatus(ids as string[]);
      res.json(stockStatus);
    } catch (error) {
      console.error("Error getting stock status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.updateOrder(req.params.id, req.body);
      res.json(order);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Mark order as seen by staff/admin
  app.patch("/api/orders/:id/mark-seen", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Add user ID to seenBy array if not already present
      const seenBy = order.seenBy || [];
      if (!seenBy.includes(userId)) {
        seenBy.push(userId);
        const updatedOrder = await storage.updateOrder(req.params.id, { seenBy: seenBy });
        res.json(updatedOrder);
      } else {
        res.json(order); // Already seen by this user
      }
    } catch (error) {
      console.error("Error marking order as seen:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/orders/:id", async (req, res) => {
    try {
      console.log(`Updating order ${req.params.id} with data:`, req.body);
      const order = await storage.updateOrder(req.params.id, req.body);
      console.log("Updated order:", order);
      
      // Send push notification to customer when status changes
      if (req.body.status && order.customerId) {
        try {
          // Get customer details for the notification
          const customer = await storage.getUser(order.customerId);
          if (customer) {
            // Send push notification based on the new status
            await webPushService.sendOrderUpdate(
              customer.id.toString(),
              order.orderNumber,
              req.body.status,
              // Optional custom message can be passed from the request
              req.body.notificationMessage
            );
            console.log(`🔔 Push notification sent to customer ${customer.email} for order ${order.orderNumber} (status: ${req.body.status})`);
          } else {
            console.warn(`⚠️  Customer not found for order ${order.orderNumber} (customerId: ${order.customerId})`);
          }
        } catch (pushError) {
          // Don't fail the order update if push notification fails
          console.error(`❌ Failed to send push notification for order ${order.orderNumber}:`, pushError instanceof Error ? pushError.message : 'Unknown push notification error');
        }
      }
      
      // Broadcast order status update to all connected SSE clients (canteen owners) with error handling
      if (sseConnections.size > 0 && req.body.status) {
        const message = `data: ${JSON.stringify({
          type: 'order_status_changed',
          data: order,
          oldStatus: req.body.oldStatus || 'unknown',
          newStatus: req.body.status
        })}\n\n`;
        
        console.log(`📡 Broadcasting order status change to ${sseConnections.size} SSE connections:`, {
          orderNumber: order.orderNumber,
          oldStatus: req.body.oldStatus,
          newStatus: req.body.status,
          messageType: 'order_status_changed'
        });
        
        // Send to all connected SSE clients with improved error handling
        const deadConnections = new Set();
        sseConnections.forEach((connection) => {
          try {
            if (connection.writable && !connection.destroyed) {
              connection.write(message);
              console.log('📤 Status update message sent to SSE client');
            } else {
              console.log('📡 Removing dead SSE connection');
              deadConnections.add(connection);
            }
          } catch (error) {
            console.warn('📡 SSE connection error during status broadcast:', error instanceof Error ? error.message : 'Unknown error');
            deadConnections.add(connection);
          }
        });
        
        // Clean up dead connections
        deadConnections.forEach(conn => sseConnections.delete(conn));
        
        console.log(`📢 Successfully broadcasted status change for ${order.orderNumber} to ${sseConnections.size} active clients`);
      } else if (!req.body.status) {
        console.log('📡 No status change to broadcast');
      } else {
        console.log('📡 No SSE connections available for status broadcast');
      }
      
      res.json(order);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Notifications endpoints
  app.get("/api/notifications", async (req, res) => {
    try {
      const notifications = await storage.getNotifications();
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/notifications", async (req, res) => {
    try {
      const validatedData = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(validatedData);
      res.status(201).json(notification);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/notifications/:id", async (req, res) => {
    try {
      const notification = await storage.updateNotification(req.params.id, req.body);
      res.json(notification);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/notifications/:id", async (req, res) => {
    try {
      await storage.deleteNotification(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });



  // Barcode delivery endpoints
  app.post("/api/delivery/scan", async (req, res) => {
    try {
      const { barcode } = req.body;
      if (!barcode) {
        return res.status(400).json({ message: "Barcode is required" });
      }

      console.log("Scanning barcode:", barcode);
      
      // Find order by barcode or order number
      let order = await storage.getOrderByBarcode(barcode);
      
      // If not found by barcode, try to find by order number (12-digit numeric format)
      if (!order && barcode.match(/^\d{12}$/)) {
        order = await storage.getOrderByOrderNumber(barcode);
      }
      
      if (!order) {
        return res.status(404).json({ 
          message: "Invalid barcode. No order found.", 
          error: "BARCODE_NOT_FOUND" 
        });
      }

      // Check if barcode was already used
      if (order.barcodeUsed) {
        return res.status(400).json({ 
          message: "🔒 This order has already been delivered.", 
          error: "BARCODE_ALREADY_USED",
          deliveredAt: order.deliveredAt 
        });
      }

      // Check if order is ready for pickup
      if (order.status !== "ready") {
        return res.status(400).json({ 
          message: `Order is not ready for pickup. Current status: ${order.status}`, 
          error: "ORDER_NOT_READY" 
        });
      }

      // Update order to delivered and mark barcode as used
      const updatedOrder = await storage.updateOrder(order.id, {
        status: "delivered",
        barcodeUsed: true,
        deliveredAt: new Date()
      });

      console.log("Order delivered successfully:", updatedOrder);

      // Send push notification to customer about delivery completion
      try {
        const customer = await storage.getUser(order.customerId);
        if (customer) {
          await webPushService.sendOrderUpdate(
            customer.id.toString(),
            order.orderNumber,
            "delivered",
            `Your order #${order.orderNumber} has been successfully delivered. Thank you for your order!`
          );
          console.log(`🔔 Delivery notification sent to customer ${customer.email} for order ${order.orderNumber}`);
        }
      } catch (pushError) {
        console.error(`❌ Failed to send delivery notification for order ${order.orderNumber}:`, pushError instanceof Error ? pushError.message : 'Unknown push notification error');
      }

      res.json({
        success: true,
        message: "Order delivered successfully!",
        order: updatedOrder
      });
    } catch (error) {
      console.error("Error processing barcode scan:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/delivery/verify/:barcode", async (req, res) => {
    try {
      const { barcode } = req.params;
      
      const order = await storage.getOrderByBarcode(barcode);
      if (!order) {
        return res.status(404).json({ 
          valid: false, 
          message: "Invalid barcode" 
        });
      }

      res.json({
        valid: true,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          status: order.status,
          barcodeUsed: order.barcodeUsed,
          deliveredAt: order.deliveredAt,
          amount: order.amount
        }
      });
    } catch (error) {
      console.error("Error verifying barcode:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin analytics endpoint
  app.get("/api/admin/analytics", async (req, res) => {
    try {
      const orders = await storage.getOrders();
      const menuItems = await storage.getMenuItems();
      
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, order) => sum + order.amount, 0);
      const activeMenuItems = menuItems.filter(item => item.available).length;
      const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

      res.json({
        totalOrders,
        totalRevenue,
        activeMenuItems,
        averageOrderValue
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Login Issues endpoints
  app.get("/api/login-issues", async (req, res) => {
    try {
      const issues = await storage.getLoginIssues();
      res.json(issues);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/login-issues/:id", async (req, res) => {
    try {
      const issue = await storage.getLoginIssue(req.params.id);
      if (!issue) {
        return res.status(404).json({ message: "Login issue not found" });
      }
      res.json(issue);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/login-issues", async (req, res) => {
    try {
      const validatedData = insertLoginIssueSchema.parse(req.body);
      const issue = await storage.createLoginIssue(validatedData);
      res.status(201).json(issue);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/login-issues/:id", async (req, res) => {
    try {
      const issueId = req.params.id;
      const { status, adminNotes, resolvedBy } = req.body;
      
      const updateData: any = {};
      if (status) updateData.status = status;
      if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
      if (resolvedBy !== undefined) updateData.resolvedBy = resolvedBy;
      if (status === "resolved") updateData.resolvedAt = new Date();

      const updatedIssue = await storage.updateLoginIssue(issueId, updateData);
      res.json(updatedIssue);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/login-issues/:id", async (req, res) => {
    try {
      await storage.deleteLoginIssue(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Quick Orders endpoints
  app.get("/api/quick-orders", async (req, res) => {
    try {
      const quickOrders = await storage.getQuickOrders();
      res.json(quickOrders);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/quick-orders", async (req, res) => {
    try {
      const validatedData = insertQuickOrderSchema.parse(req.body);
      const quickOrder = await storage.createQuickOrder(validatedData);
      res.status(201).json(quickOrder);
    } catch (error) {
      console.error("Error creating quick order:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/quick-orders/:id", async (req, res) => {
    try {
      const validatedData = insertQuickOrderSchema.parse(req.body);
      const quickOrder = await storage.updateQuickOrder(req.params.id, validatedData);
      res.json(quickOrder);
    } catch (error) {
      console.error("Error updating quick order:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/quick-orders/:id", async (req, res) => {
    try {
      await storage.deleteQuickOrder(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Delete quick order error:", error);
      res.status(500).json({ 
        message: "Failed to delete quick order", 
        error: error.message || "Internal server error" 
      });
    }
  });

  // PhonePe Payment Integration
  
  // Initiate payment with PhonePe (OAuth v2 API)
  app.post("/api/payments/initiate", async (req, res) => {
    try {
      const { amount, customerName, orderData } = req.body;
      
      if (!amount || !customerName || !orderData) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required fields: amount, customerName, orderData" 
        });
      }

      // Generate unique merchant order ID (v2 API format)
      const merchantOrderId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Optimized URL generation - cache base URL to avoid repeated detection
      const baseUrl = process.env.REPLIT_DOMAINS 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
        : req.get('host') 
          ? `${req.get('x-forwarded-proto') || 'https'}://${req.get('host')}`
          : `http://localhost:${process.env.PORT || '5000'}`;
      
      const redirectUrl = `${baseUrl}/payment-callback`;
      
      // Minimal logging for production performance
      console.log(`💰 Payment URLs generated: ${baseUrl}`);

      // Get OAuth access token
      console.log('🔐 Obtaining OAuth access token...');
      const accessToken = await getOAuthToken();

      // Create OAuth payment payload (v2 API format)
      const paymentPayload = createOAuthPaymentPayload(
        merchantOrderId,
        amount * 100, // Convert to paise
        redirectUrl
      );

      // API endpoint for v2
      const endpoint = '/pay';
      const apiUrl = `${PHONEPE_CONFIG.API_BASE_URL}${endpoint}`;

      // DEBUG: Log detailed information for troubleshooting
      console.log('🔍 PhonePe OAuth DEBUG Information:');
      console.log('📋 Payload:', JSON.stringify(paymentPayload, null, 2));
      console.log('🔑 Client ID:', PHONEPE_CONFIG.CLIENT_ID);
      console.log('🌐 API URL:', apiUrl);
      console.log('✅ OAuth Token (first 20 chars):', accessToken.substring(0, 20) + '...');

      // Make request to PhonePe v2 API with OAuth
      console.log(`💰 Making PhonePe OAuth API request to: ${apiUrl}`);
      
      const phonePeResponse = await axios.post(
        apiUrl,
        paymentPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `O-Bearer ${accessToken}`
          },
          timeout: 10000 // 10 second timeout for faster response
        }
      );
      
      console.log(`💰 PhonePe API response status: ${phonePeResponse.status}`);
      console.log('📊 PhonePe API response data:', JSON.stringify(phonePeResponse.data, null, 2));

      // Check if payment was initiated successfully
      if (phonePeResponse.data.orderId && phonePeResponse.data.redirectUrl) {
        // Store payment record AFTER successful PhonePe response
        await storage.createPayment({
          merchantTransactionId: merchantOrderId, // Using merchantOrderId as transaction ID
          amount: amount * 100, // Store in paise
          status: PAYMENT_STATUS.PENDING,
          checksum: '', // No checksum in OAuth method
          metadata: JSON.stringify({
            ...orderData,
            phonePeOrderId: phonePeResponse.data.orderId
          })
        });

        res.json({
          success: true,
          merchantTransactionId: merchantOrderId,
          phonePeOrderId: phonePeResponse.data.orderId,
          paymentUrl: phonePeResponse.data.redirectUrl
        });
      } else {
        res.status(400).json({
          success: false,
          message: phonePeResponse.data.message || "Payment initiation failed"
        });
      }
    } catch (error) {
      console.error('Payment initiation error:', error);
      
      // Handle axios timeout specifically
      if ((error as any).code === 'ECONNABORTED' || (error as any).code === 'ETIMEDOUT') {
        console.log('⏰ PhonePe API timeout during payment initiation');
        return res.status(408).json({ 
          success: false, 
          message: "Payment gateway timeout. Please try again." 
        });
      }
      
      // Handle network errors
      if ((error as any).response) {
        console.error('🚨 PhonePe API error response:', {
          status: (error as any).response.status,
          statusText: (error as any).response.statusText,
          data: (error as any).response.data,
          headers: (error as any).response.headers
        });
        return res.status(502).json({ 
          success: false, 
          message: `Payment gateway error: ${(error as any).response.data?.message || 'Service unavailable'}` 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: "Internal server error during payment initiation" 
      });
    }
  });

  // PhonePe webhook handler with production optimizations
  app.post("/api/payments/webhook", async (req, res) => {
    const startTime = Date.now();
    try {
      const receivedChecksum = req.headers['x-verify'] as string;
      const payload = req.body;

      if (!receivedChecksum) {
        console.warn('📡 Webhook missing checksum');
        return res.status(401).json({ success: false, message: 'Missing checksum' });
      }

      // Verify checksum with timing for performance monitoring
      const checksumStart = Date.now();
      console.log('📡 Webhook verification details:', {
        receivedChecksum: receivedChecksum.substring(0, 20) + '...',
        payloadKeys: Object.keys(payload),
        environment: process.env.NODE_ENV
      });
      
      if (!verifyWebhookChecksum(payload, receivedChecksum)) {
        console.error('📡 Invalid webhook checksum - potential security issue');
        console.log('📡 This might be expected in test/sandbox environment');
        
        // In development/test environment, we might want to be more lenient
        if (process.env.NODE_ENV === 'development') {
          console.warn('📡 Proceeding with webhook processing despite checksum failure in development');
        } else {
          return res.status(401).json({ success: false, message: 'Invalid checksum' });
        }
      }
      const checksumTime = Date.now() - checksumStart;
      console.log(`📡 Checksum verification took ${checksumTime}ms`);

      // Handle webhook payload structure - might be encoded
      let webhookData;
      if (payload.response) {
        // PhonePe sometimes sends response as base64 encoded
        const decodedResponse = Buffer.from(payload.response, 'base64').toString('utf-8');
        webhookData = JSON.parse(decodedResponse);
      } else if (payload.data) {
        webhookData = payload.data;
      } else {
        console.error('📡 Invalid webhook payload structure:', payload);
        return res.status(400).json({ success: false, message: 'Invalid payload structure' });
      }
      
      const { merchantTransactionId, state, responseCode } = webhookData;
      const phonePeTransactionId = webhookData.transactionId;
      const paymentMethod = webhookData.paymentInstrument?.type;

      // Update payment status
      let paymentStatus: string;
      if (state === 'COMPLETED' && responseCode === 'SUCCESS') {
        paymentStatus = PAYMENT_STATUS.SUCCESS;
      } else if (state === 'FAILED') {
        paymentStatus = PAYMENT_STATUS.FAILED;
      } else {
        paymentStatus = PAYMENT_STATUS.PENDING;
      }

      // Update payment record
      await storage.updatePaymentByMerchantTxnId(merchantTransactionId, {
        phonePeTransactionId,
        status: paymentStatus,
        paymentMethod,
        responseCode,
        responseMessage: webhookData.message
      });

      // If payment successful, create order from metadata
      if (paymentStatus === PAYMENT_STATUS.SUCCESS) {
        const payment = await storage.getPaymentByMerchantTxnId(merchantTransactionId);
        if (payment?.metadata && !payment.orderId) {
          // Parse order data from metadata
          const orderData = JSON.parse(payment.metadata);
          
          // Generate orderNumber and barcode for the new order
          const { generateOrderNumber } = await import('../shared/utils.js');
          const orderNumber = generateOrderNumber();
          const barcode = generateOrderNumber(); // Use same function for barcode
          
          const completeOrderData = {
            ...orderData,
            orderNumber,
            barcode,
            status: 'preparing' // Set to preparing since payment is successful
          };
          
          // Create the order
          const newOrder = await storage.createOrder(completeOrderData);
          
          // Update payment with order connection
          await storage.updatePaymentByMerchantTxnId(merchantTransactionId, {
            orderId: newOrder.id
          });
          
          // Broadcast new order to all connected SSE clients (canteen owners) - same as skip payment
          if (sseConnections.size > 0) {
            const message = `data: ${JSON.stringify({
              type: 'new_order',
              data: newOrder
            })}\n\n`;
            
            console.log(`📡 Broadcasting paid order to ${sseConnections.size} SSE connections:`, {
              orderNumber: newOrder.orderNumber,
              messageType: 'new_order',
              source: 'webhook'
            });
            
            // Send to all connected SSE clients with improved error handling
            const deadConnections = new Set();
            sseConnections.forEach((connection) => {
              try {
                if (connection.writable && !connection.destroyed) {
                  connection.write(message);
                  console.log('📤 Paid order message sent to SSE client');
                } else {
                  console.log('📡 Removing dead SSE connection');
                  deadConnections.add(connection);
                }
              } catch (error) {
                console.warn('📡 SSE connection error during paid order broadcast:', error instanceof Error ? error.message : 'Unknown error');
                deadConnections.add(connection);
              }
            });
            
            // Clean up dead connections
            deadConnections.forEach(conn => sseConnections.delete(conn));
            
            console.log(`📢 Successfully broadcasted paid order ${newOrder.orderNumber} to ${sseConnections.size} active clients`);
          } else {
            console.log('📡 No SSE connections available for paid order broadcast');
          }
        }
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ success: false, message: 'Processing failed' });
    }
  });

  // Check payment status
  app.get("/api/payments/status/:merchantTransactionId", async (req, res) => {
    try {
      const { merchantTransactionId } = req.params;
      
      // Get payment from database
      const payment = await storage.getPaymentByMerchantTxnId(merchantTransactionId);
      if (!payment) {
        return res.status(404).json({ 
          success: false, 
          message: "Payment not found" 
        });
      }

      // If already successful, ensure order is created and return cached status
      if (payment.status === PAYMENT_STATUS.SUCCESS) {
        let orderNumber = null;
        
        // Create order if not already created
        if (payment.metadata && !payment.orderId) {
          const orderData = JSON.parse(payment.metadata);
          
          // Generate orderNumber and barcode for the new order
          const { generateOrderNumber } = await import('../shared/utils.js');
          const generatedOrderNumber = generateOrderNumber();
          const barcode = generateOrderNumber();
          
          const completeOrderData = {
            ...orderData,
            orderNumber: generatedOrderNumber,
            barcode,
            status: 'preparing' // Set to preparing since payment is successful
          };
          
          const newOrder = await storage.createOrder(completeOrderData);
          await storage.updatePaymentByMerchantTxnId(merchantTransactionId, {
            orderId: newOrder.id
          });
          orderNumber = newOrder.orderNumber;
          
          // Store order number for return, SSE broadcast will be handled later to avoid duplication
          console.log(`📦 Order ${newOrder.orderNumber} created via cached status check`);
        } else if (payment.orderId) {
          // Get existing order number
          const order = await storage.getOrder(payment.orderId);
          orderNumber = order?.orderNumber;
        }
        
        return res.json({
          success: true,
          status: payment.status,
          data: { 
            ...payment, 
            orderNumber,
            shouldClearCart: true // Flag to clear cart on frontend
          }
        });
      }
      
      // If already failed, return cached status with retry option
      if (payment.status === PAYMENT_STATUS.FAILED) {
        return res.json({
          success: true,
          status: payment.status,
          data: { 
            ...payment,
            shouldRetry: true // Flag to show retry option
          }
        });
      }

      // Check if we should skip API call due to recent failures
      const cacheKey = merchantTransactionId;
      const cachedInfo = paymentStatusCache.get(cacheKey);
      const now = Date.now();
      
      if (cachedInfo?.shouldSkipApi && (now - cachedInfo.lastAttempt) < API_RETRY_INTERVAL) {
        console.log(`⚡ Skipping PhonePe API (${cachedInfo.consecutiveFailures} failures) - returning cached data for ${merchantTransactionId}`);
        return res.json({
          success: true,
          status: payment.status,
          data: { ...payment, fromCache: true, reason: 'api_temporarily_disabled' }
        });
      }
      
      // Try to check with PhonePe for latest status (with fast timeout)
      const checksum = generateStatusChecksum(merchantTransactionId);
      const endpoint = `/pg/v1/status/${PHONEPE_CONFIG.MERCHANT_ID}/${merchantTransactionId}`;
      
      console.log(`⚡ Attempting fast PhonePe status check for ${merchantTransactionId}`);
      const phonePeResponse = await axios.get(
        `${PHONEPE_CONFIG.API_BASE_URL}${endpoint}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': checksum,
            'X-MERCHANT-ID': PHONEPE_CONFIG.MERCHANT_ID
          },
          timeout: 3000 // 3 second timeout for better UX - fail fast and use cache
        }
      );

      if (phonePeResponse.data.success) {
        // API call succeeded - reset failure count
        paymentStatusCache.set(cacheKey, { lastAttempt: now, consecutiveFailures: 0, shouldSkipApi: false });
        
        const { state, responseCode, transactionId, paymentInstrument } = phonePeResponse.data.data;
        
        let paymentStatus: string;
        if (state === 'COMPLETED' && responseCode === 'SUCCESS') {
          paymentStatus = PAYMENT_STATUS.SUCCESS;
        } else if (state === 'FAILED') {
          paymentStatus = PAYMENT_STATUS.FAILED;
        } else {
          paymentStatus = PAYMENT_STATUS.PENDING;
        }

        // Update payment record
        const updatedPayment = await storage.updatePaymentByMerchantTxnId(merchantTransactionId, {
          phonePeTransactionId: transactionId,
          status: paymentStatus,
          paymentMethod: paymentInstrument?.type,
          responseCode,
          responseMessage: phonePeResponse.data.message
        });

        // If payment successful, create order if not already created
        let finalUpdatedPayment = updatedPayment;
        if (paymentStatus === PAYMENT_STATUS.SUCCESS) {
          if (payment.metadata && !payment.orderId) {
            // Parse order data from metadata and create order
            const orderData = JSON.parse(payment.metadata);
            
            // Generate orderNumber and barcode for the new order
            const { generateOrderNumber } = await import('../shared/utils.js');
            const orderNumber = generateOrderNumber();
            const barcode = generateOrderNumber(); // Use same function for barcode
            
            const completeOrderData = {
              ...orderData,
              orderNumber,
              barcode,
              status: 'preparing' // Set to preparing since payment is successful
            };
            
            const newOrder = await storage.createOrder(completeOrderData);
            
            // Update payment with order ID
            finalUpdatedPayment = await storage.updatePaymentByMerchantTxnId(merchantTransactionId, {
              orderId: newOrder.id
            });
            
            // Send SSE notification for new order (same format as other order creation flows)
            if (sseConnections.size > 0) {
              const message = `data: ${JSON.stringify({
                type: 'new_order',
                data: newOrder
              })}\n\n`;
              
              console.log(`📡 Broadcasting paid order to ${sseConnections.size} SSE connections:`, {
                orderNumber: newOrder.orderNumber,
                messageType: 'new_order',
                source: 'payment_status_check'
              });
              
              // Send to all connected SSE clients with error handling
              const deadConnections = new Set();
              sseConnections.forEach((connection) => {
                try {
                  if (connection.writable && !connection.destroyed) {
                    connection.write(message);
                    console.log('📤 Paid order message sent to SSE client');
                  } else {
                    console.log('📡 Removing dead SSE connection');
                    deadConnections.add(connection);
                  }
                } catch (error) {
                  console.warn('📡 SSE connection error during paid order broadcast:', error instanceof Error ? error.message : 'Unknown error');
                  deadConnections.add(connection);
                }
              });
              
              // Clean up dead connections
              deadConnections.forEach(conn => sseConnections.delete(conn));
              
              console.log(`📢 Successfully broadcasted paid order ${newOrder.orderNumber} to ${sseConnections.size} active clients`);
            } else {
              console.log('📡 No SSE connections available for paid order broadcast');
            }
          }
        }

        // Return appropriate data based on payment status
        const responseData: any = { ...finalUpdatedPayment };
        
        if (paymentStatus === PAYMENT_STATUS.SUCCESS) {
          responseData.shouldClearCart = true;
          // Get order number if order exists - check both original payment and final updated payment
          const orderId = payment.orderId || finalUpdatedPayment?.orderId;
          if (orderId) {
            const order = await storage.getOrder(orderId);
            if (order) {
              responseData.orderNumber = order.orderNumber;
              responseData.orderId = order.id;
            }
          }
        } else if (paymentStatus === PAYMENT_STATUS.FAILED) {
          responseData.shouldRetry = true;
        }

        res.json({
          success: true,
          status: paymentStatus,
          data: responseData
        });
      } else {
        res.status(400).json({
          success: false,
          message: phonePeResponse.data.message || "Status check failed"
        });
      }
    } catch (error) {
      // Track API failure for caching
      const now = Date.now();
      const cacheKey = req.params.merchantTransactionId;
      const currentInfo = paymentStatusCache.get(cacheKey) || { lastAttempt: 0, consecutiveFailures: 0, shouldSkipApi: false };
      const newFailures = currentInfo.consecutiveFailures + 1;
      paymentStatusCache.set(cacheKey, {
        lastAttempt: now,
        consecutiveFailures: newFailures,
        shouldSkipApi: newFailures >= MAX_CONSECUTIVE_FAILURES
      });
      
      console.log(`⚡ PhonePe API failed (${newFailures}/${MAX_CONSECUTIVE_FAILURES}) for ${req.params.merchantTransactionId}`);
      
      // Handle timeout specifically
      if ((error as any).code === 'ECONNABORTED' || (error as any).code === 'ETIMEDOUT') {
        console.log('⏰ PhonePe API timeout - returning cached payment status if available');
        
        // Return the cached payment status to avoid user seeing timeout error
        try {
          const cachedPayment = await storage.getPaymentByMerchantTxnId(req.params.merchantTransactionId);
          if (cachedPayment) {
            const responseData: any = { 
              ...cachedPayment,
              isTimeout: true, // Flag to indicate this is cached due to timeout
              message: 'Payment verification in progress. Please check again in a moment.'
            };
            
            // If payment is successful and has order, include order info
            if (cachedPayment.status === 'success' && cachedPayment.orderId) {
              try {
                const order = await storage.getOrder(cachedPayment.orderId);
                if (order) {
                  responseData.orderNumber = order.orderNumber;
                  responseData.orderId = order.id;
                  responseData.shouldClearCart = true;
                }
              } catch (orderError) {
                console.error('Error fetching order for cached payment:', orderError);
              }
            }
            
            return res.json({
              success: true,
              status: cachedPayment.status,
              data: responseData
            });
          }
        } catch (dbError) {
          console.error('Error fetching cached payment:', dbError);
        }
      }
      
      res.status(500).json({ 
        success: false, 
        message: "Internal server error during status check" 
      });
    }
  });

  // Get all payments (admin)
  app.get("/api/payments", async (req, res) => {
    try {
      const payments = await storage.getPayments();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // TEST ENDPOINT: Simulate PhonePe payment completion for development
  // Admin get all payments with detailed information
  app.get("/api/admin/payments", async (req, res) => {
    try {
      const allPayments = await storage.getPayments();
      
      // Enhance payment data with order information
      const enhancedPayments = await Promise.all(
        allPayments.map(async (payment) => {
          let orderDetails = null;
          if (payment.orderId) {
            const order = await storage.getOrder(payment.orderId);
            orderDetails = {
              orderNumber: order?.orderNumber,
              orderStatus: order?.status,
              customerName: order?.customerName,
              amount: order?.amount,
              items: order?.items
            };
          }
          
          return {
            ...payment,
            orderDetails,
            metadata: payment.metadata ? JSON.parse(payment.metadata) : null,
            formattedAmount: `₹${payment.amount / 100}`,
            createdAtFormatted: new Date(payment.createdAt).toLocaleString('en-IN'),
            updatedAtFormatted: new Date(payment.updatedAt).toLocaleString('en-IN')
          };
        })
      );
      
      res.json({ 
        success: true, 
        payments: enhancedPayments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      });
    } catch (error) {
      console.error('Error fetching payments:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch payments' });
    }
  });

  app.post("/api/payments/test-complete/:merchantTransactionId", async (req, res) => {
    try {
      const { merchantTransactionId } = req.params;
      
      // Get payment from database
      const payment = await storage.getPaymentByMerchantTxnId(merchantTransactionId);
      if (!payment) {
        return res.status(404).json({ 
          success: false, 
          message: "Payment not found" 
        });
      }

      // Update payment to success
      await storage.updatePaymentByMerchantTxnId(merchantTransactionId, {
        phonePeTransactionId: `TEST_${Date.now()}`,
        status: PAYMENT_STATUS.SUCCESS,
        paymentMethod: 'UPI',
        responseCode: 'SUCCESS',
        responseMessage: 'Test payment completed successfully'
      });

      // Update order status
      if (payment.orderId) {
        await storage.updateOrder(payment.orderId, { status: 'preparing' });
        
        // Send SSE notification
        const notification = {
          type: 'payment_success',
          orderId: payment.orderId,
          merchantTransactionId,
          message: 'Test payment completed successfully'
        };
        
        sseConnections.forEach(connection => {
          connection.write(`data: ${JSON.stringify(notification)}\n\n`);
        });
      }

      res.json({
        success: true,
        message: 'Test payment completed successfully',
        merchantTransactionId
      });
    } catch (error) {
      console.error('Test payment completion error:', error);
      res.status(500).json({ success: false, message: 'Test payment completion failed' });
    }
  });

  // Complaint management endpoints
  app.get("/api/complaints", async (req, res) => {
    try {
      const complaints = await storage.getComplaints();
      res.json(complaints);
    } catch (error) {
      console.error("Error fetching complaints:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/complaints", async (req, res) => {
    try {
      const validatedData = insertComplaintSchema.parse(req.body);
      const complaint = await storage.createComplaint(validatedData);
      res.status(201).json(complaint);
    } catch (error) {
      console.error("Error creating complaint:", error);
      res.status(400).json({ message: "Invalid complaint data" });
    }
  });

  app.get("/api/complaints/:id", async (req, res) => {
    try {
      const complaint = await storage.getComplaint(req.params.id);
      if (!complaint) {
        return res.status(404).json({ message: "Complaint not found" });
      }
      res.json(complaint);
    } catch (error) {
      console.error("Error fetching complaint:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/complaints/:id", async (req, res) => {
    try {
      const updateData = req.body;
      const complaint = await storage.updateComplaint(req.params.id, updateData);
      if (!complaint) {
        return res.status(404).json({ message: "Complaint not found" });
      }
      res.json(complaint);
    } catch (error) {
      console.error("Error updating complaint:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/complaints/:id", async (req, res) => {
    try {
      const complaint = await storage.deleteComplaint(req.params.id);
      if (!complaint) {
        return res.status(404).json({ message: "Complaint not found" });
      }
      res.json({ message: "Complaint deleted successfully" });
    } catch (error) {
      console.error("Error deleting complaint:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create sample complaints based on real users and orders
  app.post("/api/complaints/generate-samples", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const orders = await storage.getOrders();
      
      const sampleComplaints = [];
      const complaintTypes = [
        { subject: "Payment Issue", description: "Payment was deducted but order not processed", category: "Payment" },
        { subject: "Order Delay", description: "Order taking too long to prepare", category: "Service" },
        { subject: "Food Quality", description: "Food quality was not satisfactory", category: "Quality" },
        { subject: "Missing Items", description: "Some items were missing from my order", category: "Service" },
        { subject: "Wrong Order", description: "Received different items than ordered", category: "Service" },
        { subject: "Cold Food", description: "Food was cold when received", category: "Quality" },
        { subject: "App Issue", description: "Unable to place order through app", category: "Technical" },
        { subject: "Refund Request", description: "Need refund for cancelled order", category: "Payment" }
      ];
      
      // Generate complaints from real users
      for (let i = 0; i < Math.min(5, users.length); i++) {
        const user = users[i];
        const complaintType = complaintTypes[i % complaintTypes.length];
        const userOrder = orders.find(o => o.customerId === user.id);
        
        const complaint = await storage.createComplaint({
          subject: complaintType.subject,
          description: complaintType.description,
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          category: complaintType.category,
          priority: ['High', 'Medium', 'Low'][i % 3],
          status: 'Open',
          orderId: userOrder?.id
        });
        
        sampleComplaints.push(complaint);
      }
      
      res.json({
        success: true,
        message: `Generated ${sampleComplaints.length} sample complaints`,
        complaints: sampleComplaints
      });
    } catch (error) {
      console.error("Error generating sample complaints:", error);
      res.status(500).json({ message: "Failed to generate sample complaints" });
    }
  });

  // Inventory Management Endpoints
  
  // Get all inventory items (menu item stock tracking)
  app.get("/api/inventory", async (req, res) => {
    try {
      // Fetch menu items and categories from database
      const menuItems = await storage.getMenuItems();
      const categories = await storage.getCategories();
      
      // Convert menu items to inventory tracking items
      const inventoryItems = menuItems.map((item: any) => {
        const category = categories.find((cat: any) => cat.id === item.categoryId);
        
        // Generate realistic stock levels for prepared dishes/items
        const baseStock = Math.floor(Math.random() * 50) + 10; // 10-60 items available
        const minThreshold = 5; // Minimum 5 items before restock
        const maxThreshold = 100; // Maximum capacity
        
        // Determine status based on stock levels
        let status = "in_stock";
        if (baseStock === 0) {
          status = "out_of_stock";
        } else if (baseStock <= minThreshold) {
          status = "low_stock";
        }
        
        return {
          id: `inv_${item.id}`,
          name: item.name,
          category: category?.name || 'Uncategorized',
          unit: "pcs", // Menu items are counted in pieces
          currentStock: baseStock,
          minThreshold,
          maxThreshold,
          sellingPrice: item.price,
          lastPrepared: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          description: item.description || `Ready-to-serve ${item.name}`,
          status,
          menuItemId: item.id,
          available: item.available && baseStock > 0
        };
      });
      
      res.json(inventoryItems);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Add new inventory item
  app.post("/api/inventory", async (req, res) => {
    try {
      const itemData = req.body;
      
      // Validate required fields
      if (!itemData.name || !itemData.category) {
        return res.status(400).json({ message: "Name and category are required" });
      }
      
      // Determine status based on current stock and thresholds
      let status = "in_stock";
      if (itemData.currentStock === 0) {
        status = "out_of_stock";
      } else if (itemData.currentStock <= itemData.minThreshold) {
        status = "low_stock";
      }
      
      const newItem = {
        ...itemData,
        id: `inv_${Date.now()}`,
        lastRestocked: new Date().toISOString(),
        status
      };
      
      // In production, save to database
      console.log("New inventory item created:", newItem);
      
      res.json(newItem);
    } catch (error) {
      console.error("Error creating inventory item:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update inventory item
  app.patch("/api/inventory/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // In production, update in database
      console.log(`Updated inventory item ${id}:`, updateData);
      
      res.json({ id, ...updateData });
    } catch (error) {
      console.error("Error updating inventory item:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete inventory item
  app.delete("/api/inventory/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // In production, delete from database
      console.log(`Deleted inventory item ${id}`);
      
      res.json({ message: "Item deleted successfully" });
    } catch (error) {
      console.error("Error deleting inventory item:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get stock movements based on menu items  
  app.get("/api/inventory/movements", async (req, res) => {
    try {
      // Fetch menu items to generate realistic movements
      const menuItems = await storage.getMenuItems();
      
      // Generate realistic stock movements for menu items
      const movements: any[] = [];
      const movementTypes = ['in', 'out', 'adjustment'];
      const reasons = {
        'in': ['Items prepared', 'Kitchen production', 'Daily prep', 'Fresh batch ready'],
        'out': ['Order served', 'Customer purchase', 'Daily sales', 'Item sold'],
        'adjustment': ['Stock count correction', 'Expired items removed', 'Quality check adjustment']
      };
      const users = ['Kitchen Staff', 'Chef', 'Canteen Manager', 'Server'];
      
      // Generate movements for first 10 menu items to keep it manageable
      menuItems.slice(0, 10).forEach((item: any, index: number) => {
        // Generate 1-3 movements per item over the past week
        const numMovements = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < numMovements; i++) {
          const type = movementTypes[Math.floor(Math.random() * movementTypes.length)];
          const reasonList = reasons[type as keyof typeof reasons];
          const reason = reasonList[Math.floor(Math.random() * reasonList.length)];
          const user = users[Math.floor(Math.random() * users.length)];
          
          let quantity = Math.floor(Math.random() * 15) + 1; // 1-15 items
          const originalQuantity = quantity;
          
          if (type === 'out') quantity = -quantity;
          if (type === 'adjustment') quantity = Math.random() > 0.5 ? quantity : -quantity;
          
          movements.push({
            id: `mov_${item.id}_${i}`,
            itemId: `inv_${item.id}`,
            itemName: item.name,
            type,
            quantity: Math.abs(originalQuantity),
            reason,
            date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
            user,
            value: Math.abs(originalQuantity) * item.price
          });
        }
      });
      
      // Sort by date (newest first)
      movements.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      res.json(movements);
    } catch (error) {
      console.error("Error fetching stock movements:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Record stock movement
  app.post("/api/inventory/movements", async (req, res) => {
    try {
      const movementData = req.body;
      
      // Validate required fields
      if (!movementData.itemId || !movementData.type || !movementData.quantity || !movementData.reason) {
        return res.status(400).json({ message: "ItemId, type, quantity, and reason are required" });
      }
      
      const newMovement = {
        ...movementData,
        id: `mov_${Date.now()}`,
        date: new Date().toISOString()
      };
      
      // In production, save to database and update item stock
      console.log("New stock movement recorded:", newMovement);
      
      res.json(newMovement);
    } catch (error) {
      console.error("Error recording stock movement:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get suppliers based on menu categories
  app.get("/api/inventory/suppliers", async (req, res) => {
    try {
      // For menu item inventory, suppliers would be kitchen/preparation teams
      const categories = await storage.getCategories();
      const menuItems = await storage.getMenuItems();
      
      // Generate kitchen teams/suppliers based on actual categories
      const suppliers = categories.map((category: any) => {
        const categoryItems = menuItems.filter((item: any) => item.categoryId === category.id);
        const itemCount = categoryItems.length;
        
        // Calculate total value based on actual menu items in stock
        const totalValue = categoryItems.reduce((sum: number, item: any) => {
          const avgStock = Math.floor(Math.random() * 30) + 10; // Average stock
          return sum + (item.price * avgStock);
        }, 0);
        
        // Generate kitchen team/supplier name based on category
        const teamNames: { [key: string]: string } = {
          'default': `${category.name} Kitchen Team`,
          'snack': 'Snacks Preparation Team',
          'sweet': 'Desserts & Sweets Team',
          'beverage': 'Beverages Counter',
          'main': 'Main Course Kitchen',
          'rice': 'Rice & Grains Station',
          'curry': 'Curry & Gravy Station'
        };
        
        const teamKey = Object.keys(teamNames).find(key => 
          category.name.toLowerCase().includes(key)
        ) || 'default';
        
        const teamName = teamNames[teamKey] || `${category.name} Team`;
        
        return {
          id: `sup_${category.id}`,
          name: teamName,
          contact: `Ext. ${Math.floor(Math.random() * 100) + 100}`,
          email: `${teamName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '')}@canteen.local`,
          itemCount,
          totalValue: Math.round(totalValue),
          category: category.name
        };
      }).filter((supplier: any) => supplier.itemCount > 0); // Only include teams with items
      
      res.json(suppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Register Web Push API routes
  app.use('/api/push', webPushRoutes);

  const httpServer = createServer(app);

  return httpServer;
}
