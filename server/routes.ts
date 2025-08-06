import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertCategorySchema, 
  insertMenuItemSchema, 
  insertOrderSchema, 
  insertNotificationSchema,
  insertLoginIssueSchema,
  insertQuickOrderSchema,
  insertPaymentSchema
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
import axios from "axios";

// Store SSE connections for real-time notifications
const sseConnections = new Set<any>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Server-Sent Events endpoint for real-time order notifications
  app.get("/api/events/orders", (req, res) => {
    // Set headers for SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Add connection to the set
    sseConnections.add(res);
    
    // Send initial connection confirmation
    res.write('data: {"type": "connected", "message": "Connected to real-time order updates"}\n\n');
    
    console.log(`📡 SSE client connected. Total connections: ${sseConnections.size}`);

    // Handle client disconnect
    req.on('close', () => {
      sseConnections.delete(res);
      console.log(`📡 SSE client disconnected. Total connections: ${sseConnections.size}`);
    });
  });

  // User management endpoints
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
      const user = await storage.createUser(validatedData);
      res.status(201).json(user);
    } catch (error) {
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
      if (error.code === '23505') { // PostgreSQL unique constraint violation
        res.status(409).json({ message: "Category already exists" });
      } else {
        res.status(500).json({ message: "Internal server error", error: error.message });
      }
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      await storage.deleteCategory(parseInt(req.params.id));
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
      const menuItem = await storage.getMenuItem(parseInt(req.params.id));
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
      const menuItem = await storage.createMenuItem(validatedData);
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
      
      const menuItem = await storage.updateMenuItem(parseInt(req.params.id), validatedData);
      res.json(menuItem);
    } catch (error) {
      console.error("Error updating menu item:", error);
      res.status(500).json({ message: "Internal server error", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.delete("/api/menu/:id", async (req, res) => {
    try {
      await storage.deleteMenuItem(parseInt(req.params.id));
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
      const order = await storage.getOrder(parseInt(req.params.id));
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
      const order = await storage.createOrder(validatedData);
      
      // Broadcast new order to all connected SSE clients (canteen owners)
      if (sseConnections.size > 0) {
        const message = `data: ${JSON.stringify({
          type: 'new_order',
          data: order
        })}\n\n`;
        
        // Send to all connected SSE clients
        sseConnections.forEach((connection) => {
          try {
            connection.write(message);
          } catch (error) {
            // Remove dead connections
            sseConnections.delete(connection);
          }
        });
        
        console.log(`📢 Broadcasted new order ${order.orderNumber} to ${sseConnections.size} connected clients`);
      }
      
      res.status(201).json(order);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.updateOrder(parseInt(req.params.id), req.body);
      res.json(order);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/orders/:id", async (req, res) => {
    try {
      console.log(`Updating order ${req.params.id} with data:`, req.body);
      const order = await storage.updateOrder(parseInt(req.params.id), req.body);
      console.log("Updated order:", order);
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
      const notification = await storage.updateNotification(parseInt(req.params.id), req.body);
      res.json(notification);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/notifications/:id", async (req, res) => {
    try {
      await storage.deleteNotification(parseInt(req.params.id));
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
      const issue = await storage.getLoginIssue(parseInt(req.params.id));
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
      const issueId = parseInt(req.params.id);
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
      await storage.deleteLoginIssue(parseInt(req.params.id));
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
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/quick-orders/:id", async (req, res) => {
    try {
      const validatedData = insertQuickOrderSchema.parse(req.body);
      const quickOrder = await storage.updateQuickOrder(parseInt(req.params.id), validatedData);
      res.json(quickOrder);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/quick-orders/:id", async (req, res) => {
    try {
      await storage.deleteQuickOrder(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
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
      
      // Create callback URLs
      const baseUrl = process.env.REPLIT_DOMAINS 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
        : 'http://localhost:5000';
      
      const redirectUrl = `${baseUrl}/payment-callback`;
      const callbackUrl = `${baseUrl}/api/payments/webhook`;

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
        orderId: null, // No order created yet
        merchantTransactionId,
        amount: amount * 100, // Store in paise
        status: PAYMENT_STATUS.PENDING,
        checksum,
        metadata: JSON.stringify(orderData) // Store order data for later
      });

      // Make request to PhonePe
      const phonePeResponse = await axios.post(
        `${PHONEPE_CONFIG.BASE_URL}${endpoint}`,
        { request: base64Payload },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': checksum
          }
        }
      );

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
      res.status(500).json({ 
        success: false, 
        message: "Internal server error during payment initiation" 
      });
    }
  });

  // PhonePe webhook handler
  app.post("/api/payments/webhook", async (req, res) => {
    try {
      const receivedChecksum = req.headers['x-verify'] as string;
      const payload = req.body;

      if (!receivedChecksum) {
        return res.status(401).json({ success: false, message: 'Missing checksum' });
      }

      // Verify checksum
      if (!verifyWebhookChecksum(payload, receivedChecksum)) {
        console.error('Invalid webhook checksum');
        return res.status(401).json({ success: false, message: 'Invalid checksum' });
      }

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
          
          // Update payment with order ID
          await storage.updatePaymentByMerchantTxnId(merchantTransactionId, {
            orderId: newOrder.id
          });
          
          // Send SSE notification
          const notification = {
            type: 'payment_success',
            orderId: newOrder.id,
            orderNumber: newOrder.orderNumber,
            merchantTransactionId,
            message: 'Payment completed successfully'
          };
          
          sseConnections.forEach(connection => {
            connection.write(`data: ${JSON.stringify(notification)}\n\n`);
          });
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
        } else if (payment.orderId) {
          // Get existing order number
          const order = await storage.getOrder(payment.orderId);
          orderNumber = order?.orderNumber;
        }
        
        return res.json({
          success: true,
          status: payment.status,
          data: { ...payment, orderNumber }
        });
      }
      
      // If already failed, return cached status
      if (payment.status === PAYMENT_STATUS.FAILED) {
        return res.json({
          success: true,
          status: payment.status,
          data: payment
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
          }
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
            await storage.updatePaymentByMerchantTxnId(merchantTransactionId, {
              orderId: newOrder.id
            });
            
            // Send SSE notification
            const notification = {
              type: 'payment_success',
              orderId: newOrder.id,
              orderNumber: newOrder.orderNumber,
              merchantTransactionId,
              message: 'Payment completed successfully'
            };
            
            sseConnections.forEach(connection => {
              connection.write(`data: ${JSON.stringify(notification)}\n\n`);
            });
          }
        }

        res.json({
          success: true,
          status: paymentStatus,
          data: updatedPayment
        });
      } else {
        res.status(400).json({
          success: false,
          message: phonePeResponse.data.message || "Status check failed"
        });
      }
    } catch (error) {
      console.error('Payment status check error:', error);
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

  const httpServer = createServer(app);

  return httpServer;
}
