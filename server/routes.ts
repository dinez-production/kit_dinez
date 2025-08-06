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

// Background task to monitor payment timeouts
async function monitorPaymentTimeouts() {
  try {
    // Get timed out pending orders
    const timedOutOrders = await storage.getTimedOutPendingOrders();
    
    for (const pendingOrder of timedOutOrders) {
      if (pendingOrder.status === 'payment_pending') {
        // Mark as timeout and update payment
        await storage.updatePendingOrder(pendingOrder.id, {
          status: 'payment_timeout'
        });
        
        // Update associated payment
        if (pendingOrder.merchantTransactionId) {
          await storage.updatePaymentByMerchantTxnId(pendingOrder.merchantTransactionId, {
            status: PAYMENT_STATUS.TIMEOUT
          });
        }
        
        console.log(`⏰ Payment timeout for order ${pendingOrder.orderNumber}`);
      }
    }
  } catch (error) {
    console.error('Error monitoring payment timeouts:', error);
  }
}

// Start background monitoring (every 30 seconds)
setInterval(monitorPaymentTimeouts, 30000);

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
    res.write('data: {"type": "connected", "message": "Connected to real-time order updates"}\\n\\n');
    
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

  // Orders endpoints (includes both confirmed orders and pending payment orders)
  app.get("/api/orders", async (req, res) => {
    try {
      const { customerId } = req.query;
      let orders = [];
      let pendingOrders = [];

      if (customerId) {
        // Get confirmed orders for specific customer
        const allOrders = await storage.getOrders();
        orders = allOrders.filter(order => order.customerId === parseInt(customerId as string));
        
        // Get pending orders for specific customer
        pendingOrders = await storage.getPendingOrdersByCustomer(parseInt(customerId as string));
      } else {
        // Get all orders (admin view)
        orders = await storage.getOrders();
        pendingOrders = await storage.getPendingOrders();
      }

      // Transform pending orders to look like regular orders with appropriate status
      const transformedPendingOrders = pendingOrders
        .filter(pendingOrder => ['payment_pending', 'payment_failed', 'payment_timeout'].includes(pendingOrder.status)) // Show all pending payment orders
        .map(pendingOrder => ({
          id: pendingOrder.id,
          orderNumber: pendingOrder.orderNumber,
          customerId: pendingOrder.customerId,
          customerName: pendingOrder.customerName,
          customerPhone: pendingOrder.customerPhone,
          items: pendingOrder.items,
          amount: pendingOrder.totalAmount,
          status: pendingOrder.status, // Use actual pending order status (payment_pending, payment_failed, etc.)
          barcode: pendingOrder.barcode,
          createdAt: pendingOrder.createdAt,
          updatedAt: pendingOrder.updatedAt,
          estimatedTime: null,
          deliveredAt: null,
          barcodeUsed: false,
          isPendingPayment: true, // Flag to identify pending orders
          merchantTransactionId: pendingOrder.merchantTransactionId,
          paymentTimeoutAt: pendingOrder.paymentTimeoutAt
        }));

      // Combine orders with pending orders
      const combinedOrders = [...orders, ...transformedPendingOrders]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json(combinedOrders);
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

  // PhonePe Payment Integration
  
  // Initiate payment with PhonePe - creates pending order immediately
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
      
      // Generate order number and barcode for pending order
      const orderNumber = generateOrderNumber();
      const barcode = generateOrderNumber(); // Use same function for barcode
      
      // Calculate 10 minutes from now for timeout
      const paymentTimeoutAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      // Create pending order that will appear in user's orders immediately
      const pendingOrder = await storage.createPendingOrder({
        orderNumber,
        customerId: orderData.customerId || null,
        customerName,
        customerPhone: orderData.customerPhone || null,
        items: JSON.stringify(orderData.items),
        totalAmount: amount * 100, // Store in paise
        barcode,
        merchantTransactionId,
        paymentTimeoutAt
      });

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

      // Store payment record linked to pending order
      await storage.createPayment({
        orderId: null, // No actual order created yet
        pendingOrderId: pendingOrder.id,
        merchantTransactionId,
        amount: amount * 100, // Store in paise
        status: PAYMENT_STATUS.PENDING,
        checksum,
        metadata: JSON.stringify(orderData) // Store order data for backup
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
          orderNumber: pendingOrder.orderNumber, // Return pending order number
          paymentUrl: phonePeResponse.data.data.instrumentResponse.redirectInfo.url
        });
      } else {
        // Update payment and pending order status to failed
        await storage.updatePaymentByMerchantTxnId(merchantTransactionId, {
          status: PAYMENT_STATUS.FAILED,
          responseCode: phonePeResponse.data.code,
          responseMessage: phonePeResponse.data.message
        });
        
        await storage.updatePendingOrder(pendingOrder.id, {
          status: 'payment_failed'
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

  // PhonePe webhook handler - converts pending order to confirmed order on success
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

      // If payment successful, convert pending order to confirmed order
      if (paymentStatus === PAYMENT_STATUS.SUCCESS) {
        const payment = await storage.getPaymentByMerchantTxnId(merchantTransactionId);
        if (payment?.pendingOrderId && !payment.orderId) {
          const pendingOrder = await storage.getPendingOrder(payment.pendingOrderId);
          if (pendingOrder) {
            // Create confirmed order from pending order
            const confirmedOrder = await storage.createOrder({
              orderNumber: pendingOrder.orderNumber, // Keep same order number
              customerId: pendingOrder.customerId,
              customerName: pendingOrder.customerName,
              items: pendingOrder.items,
              amount: pendingOrder.totalAmount,
              status: 'preparing',
              barcode: pendingOrder.barcode, // Keep same barcode
              estimatedTime: 15 // Default 15 minutes
            });
            
            // Update payment with actual order ID
            await storage.updatePayment(payment.id, {
              orderId: confirmedOrder.id
            });
            
            // Mark pending order as converted
            await storage.updatePendingOrder(pendingOrder.id, {
              status: 'payment_success',
              convertedToOrderAt: new Date()
            });
            
            // Send SSE notification to canteen owner
            const notification = {
              type: 'new_order_from_pending',
              orderId: confirmedOrder.id,
              orderNumber: confirmedOrder.orderNumber,
              merchantTransactionId,
              message: `Order ${confirmedOrder.orderNumber} payment completed - now ready for preparation`
            };
            
            sseConnections.forEach(connection => {
              connection.write(`data: ${JSON.stringify(notification)}\\n\\n`);
            });
          }
        }
      } else if (paymentStatus === PAYMENT_STATUS.FAILED) {
        // Mark pending order as failed
        const payment = await storage.getPaymentByMerchantTxnId(merchantTransactionId);
        if (payment?.pendingOrderId) {
          await storage.updatePendingOrder(payment.pendingOrderId, {
            status: 'payment_failed'
          });
        }
      }

      res.json({ success: true, message: 'Webhook processed' });
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ success: false, message: 'Processing failed' });
    }
  });

  // Check payment status - handles background monitoring
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

      // If already successful, return cached status with order info
      if (payment.status === PAYMENT_STATUS.SUCCESS) {
        let orderNumber = null;
        
        if (payment.orderId) {
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
      
      // If already failed or timeout, return cached status
      if (payment.status === PAYMENT_STATUS.FAILED || payment.status === PAYMENT_STATUS.TIMEOUT) {
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

        // If payment successful, convert pending order to confirmed order
        if (paymentStatus === PAYMENT_STATUS.SUCCESS) {
          if (payment.pendingOrderId && !payment.orderId) {
            const pendingOrder = await storage.getPendingOrder(payment.pendingOrderId);
            if (pendingOrder) {
              // Create confirmed order
              const confirmedOrder = await storage.createOrder({
                orderNumber: pendingOrder.orderNumber,
                customerId: pendingOrder.customerId,
                customerName: pendingOrder.customerName,
                items: pendingOrder.items,
                amount: pendingOrder.totalAmount,
                status: 'preparing',
                barcode: pendingOrder.barcode,
                estimatedTime: 15
              });
              
              // Update payment with order ID
              await storage.updatePayment(payment.id, {
                orderId: confirmedOrder.id
              });
              
              // Mark pending order as converted
              await storage.updatePendingOrder(pendingOrder.id, {
                status: 'payment_success',
                convertedToOrderAt: new Date()
              });
              
              // Send SSE notification
              const notification = {
                type: 'new_order_from_pending',
                orderId: confirmedOrder.id,
                orderNumber: confirmedOrder.orderNumber,
                merchantTransactionId,
                message: `Order ${confirmedOrder.orderNumber} payment completed - now ready for preparation`
              };
              
              sseConnections.forEach(connection => {
                connection.write(`data: ${JSON.stringify(notification)}\\n\\n`);
              });
            }
          }
        }

        // Return appropriate data based on payment status
        const responseData: any = { ...updatedPayment };
        
        if (paymentStatus === PAYMENT_STATUS.SUCCESS) {
          responseData.shouldClearCart = true;
          // Get order number if order exists
          if (payment.orderId || updatedPayment?.orderId) {
            const orderId = payment.orderId || updatedPayment?.orderId;
            const order = await storage.getOrder(orderId!);
            responseData.orderNumber = order?.orderNumber;
          }
        } else if (paymentStatus === PAYMENT_STATUS.FAILED) {
          responseData.shouldRetry = true;
          // Mark pending order as failed
          if (payment.pendingOrderId) {
            await storage.updatePendingOrder(payment.pendingOrderId, {
              status: 'payment_failed'
            });
          }
        }

        res.json({
          success: true,
          status: paymentStatus,
          data: responseData
        });
      } else {
        // PhonePe API call failed, return current status
        res.json({
          success: true,
          status: payment.status,
          data: { 
            ...payment,
            apiError: true
          }
        });
      }
    } catch (error) {
      console.error('Payment status check error:', error);
      res.status(500).json({ 
        success: false, 
        message: "Error checking payment status" 
      });
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
      const validatedData = insertQuickOrderSchema.partial().parse(req.body);
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

  const server = createServer(app);
  return server;
}