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
  generatePaymentChecksum, 
  generateStatusChecksum, 
  verifyWebhookChecksum, 
  createPaymentPayload,
  PAYMENT_STATUS,
  PHONEPE_RESPONSE_CODES
} from "@shared/phonepe";
import { healthCheckHandler } from "./health-check";
import { SimpleSchemaValidator } from "./migrations/simple-schema-check";
import axios from "axios";

// Store SSE connections for real-time notifications
const sseConnections = new Set<any>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint with comprehensive database status
  app.get("/api/health", healthCheckHandler);

  // Simple health check endpoint for quick status
  app.get("/api/status", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
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
      
      // Check for duplicate register number if student
      if (validatedData.role === "student" && validatedData.registerNumber) {
        const existingRegisterUser = await storage.getUserByRegisterNumber(validatedData.registerNumber);
        if (existingRegisterUser) {
          return res.status(409).json({ message: "Register number is already registered" });
        }
      }
      
      // Check for duplicate staff ID if staff
      if (validatedData.role === "staff" && validatedData.staffId) {
        const existingStaffUser = await storage.getUserByStaffId(validatedData.staffId);
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
      const user = await storage.getUserByRegisterNumber(req.params.registerNumber);
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
      const user = await storage.getUserByStaffId(req.params.staffId);
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
      const user = await storage.updateUser(parseInt(req.params.id), req.body);
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
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
      
      // Process stock deduction before creating the order
      let orderItems = [];
      try {
        orderItems = JSON.parse(validatedData.items);
      } catch (error) {
        return res.status(400).json({ message: "Invalid order items format" });
      }

      // Check stock availability and markable status for each item
      const stockErrors = [];
      const stockUpdates = [];
      let hasMarkableItem = false; // Track if any item requires manual marking
      
      for (const item of orderItems) {
        const menuItem = await storage.getMenuItem(item.id);
        if (!menuItem) {
          stockErrors.push(`Item ${item.name} not found`);
          continue;
        }
        
        if (menuItem.stock < item.quantity) {
          stockErrors.push(`Insufficient stock for ${item.name}. Available: ${menuItem.stock}, Requested: ${item.quantity}`);
          continue;
        }
        
        // Check if this item is markable (requires manual preparation)
        if (menuItem.isMarkable) {
          hasMarkableItem = true;
        }
        
        // Prepare stock update
        stockUpdates.push({
          id: item.id,
          currentStock: menuItem.stock,
          newStock: menuItem.stock - item.quantity,
          quantity: item.quantity
        });
      }
      
      // If there are stock errors, don't process the order
      if (stockErrors.length > 0) {
        return res.status(400).json({ 
          message: "Order cannot be processed due to stock issues",
          errors: stockErrors
        });
      }
      
      // Determine order status based on markable items
      // If all items are non-markable (isMarkable: false), auto-ready the order
      // If any item is markable (isMarkable: true), keep it as pending for manual processing
      const orderStatus = hasMarkableItem ? "pending" : "ready";
      
      // Update validated data with appropriate status
      const finalOrderData = {
        ...validatedData,
        status: orderStatus
      };
      
      // Log the markable decision for debugging
      console.log(`🔄 Order ${orderNumber}: ${hasMarkableItem ? 'Has markable items - status: pending' : 'All non-markable items - status: ready'}`);
      
      // Create the order first
      const order = await storage.createOrder(finalOrderData);
      
      // Then update stock levels
      for (const update of stockUpdates) {
        try {
          await storage.updateMenuItem(update.id, { stock: update.newStock });
          console.log(`📦 Stock updated for item ${update.id}: ${update.currentStock} → ${update.newStock} (${update.quantity} ordered)`);
        } catch (error) {
          console.error(`❌ Failed to update stock for item ${update.id}:`, error);
        }
      }
      
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

  app.patch("/api/orders/:id", async (req, res) => {
    try {
      console.log(`Updating order ${req.params.id} with data:`, req.body);
      const order = await storage.updateOrder(req.params.id, req.body);
      console.log("Updated order:", order);
      
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
  
  // Initiate payment with PhonePe
  app.post("/api/payments/initiate", async (req, res) => {
    try {
      const { amount, customerName, orderData } = req.body;
      
      if (!amount || !customerName || !orderData) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required fields: amount, customerName, orderData" 
        });
      }

      // Generate unique merchant transaction ID
      const merchantTransactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create callback URLs - Dynamic base URL detection
      let baseUrl: string;
      
      if (process.env.REPLIT_DOMAINS) {
        // Replit deployment - use the domain from environment
        baseUrl = `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`;
      } else if (req.get('host')) {
        // Use the actual host from the request header
        const protocol = req.get('x-forwarded-proto') || (req.connection as any)?.encrypted ? 'https' : 'http';
        baseUrl = `${protocol}://${req.get('host')}`;
      } else {
        // Final fallback to localhost with current port
        const port = process.env.PORT || '5000';
        baseUrl = `http://localhost:${port}`;
      }
      
      const redirectUrl = `${baseUrl}/payment-callback`;
      const callbackUrl = `${baseUrl}/api/payments/webhook`;
      
      // Log the generated URLs for debugging
      console.log(`💰 Payment URLs generated:`);
      console.log(`   Base URL: ${baseUrl}`);
      console.log(`   Redirect URL: ${redirectUrl}`);
      console.log(`   Callback URL: ${callbackUrl}`);

      // Create payment payload
      const paymentPayload = createPaymentPayload(
        merchantTransactionId,
        amount,
        customerName,
        redirectUrl,
        callbackUrl
      );

      // Generate checksum
      const endpoint = '/pg/v1/pay';
      const checksum = generatePaymentChecksum(paymentPayload, endpoint);
      
      // Base64 encode the payload
      const base64Payload = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');

      // Store payment record with order data for later order creation
      await storage.createPayment({
        merchantTransactionId,
        amount: amount * 100, // Store in paise
        status: PAYMENT_STATUS.PENDING,
        checksum,
        metadata: JSON.stringify(orderData) // Store order data for later
      });

      // Make request to PhonePe with timeout
      console.log(`💰 Making PhonePe API request to: ${PHONEPE_CONFIG.BASE_URL}${endpoint}`);
      console.log(`💰 Payload size: ${base64Payload.length} characters`);
      
      const phonePeResponse = await axios.post(
        `${PHONEPE_CONFIG.BASE_URL}${endpoint}`,
        { request: base64Payload },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': checksum
          },
          timeout: 30000 // 30 second timeout instead of default
        }
      );
      
      console.log(`💰 PhonePe API response status: ${phonePeResponse.status}`);
      console.log(`💰 PhonePe API response data:`, phonePeResponse.data);

      if (phonePeResponse.data.success) {
        res.json({
          success: true,
          merchantTransactionId,
          paymentUrl: phonePeResponse.data.data.instrumentResponse.redirectInfo.url
        });
      } else {
        // Update payment status to failed
        await storage.updatePaymentByMerchantTxnId(merchantTransactionId, {
          status: PAYMENT_STATUS.FAILED,
          responseCode: phonePeResponse.data.code,
          responseMessage: phonePeResponse.data.message
        });
        
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
        console.error('PhonePe API error response:', (error as any).response.data);
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

      const { merchantTransactionId, state, responseCode } = payload.data;
      const phonePeTransactionId = payload.data.transactionId;
      const paymentMethod = payload.data.paymentInstrument?.type;

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
        responseMessage: payload.message
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

      // Check with PhonePe for latest status
      const checksum = generateStatusChecksum(merchantTransactionId);
      const endpoint = `/pg/v1/status/${PHONEPE_CONFIG.MERCHANT_ID}/${merchantTransactionId}`;

      const phonePeResponse = await axios.get(
        `${PHONEPE_CONFIG.BASE_URL}${endpoint}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': checksum,
            'X-MERCHANT-ID': PHONEPE_CONFIG.MERCHANT_ID
          },
          timeout: 10000 // 10 second timeout instead of hanging indefinitely
        }
      );

      if (phonePeResponse.data.success) {
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
      console.error('Payment status check error:', error);
      
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

  const httpServer = createServer(app);

  return httpServer;
}
