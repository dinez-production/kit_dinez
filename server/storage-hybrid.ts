import { PrismaClient } from '@prisma/client';
import type { User, Prisma } from '@prisma/client';
import { connectToMongoDB } from './mongodb';
import { 
  Category, MenuItem, Order, OrderItem, Notification, LoginIssue, QuickOrder, Payment, Complaint, Coupon,
  type ICategory, type IMenuItem, type IOrder, type IOrderItem, 
  type INotification, type ILoginIssue, type IQuickOrder, type IPayment, type IComplaint, type ICoupon
} from './models/mongodb-models';
import { db as getPostgresDb } from "./db";
import mongoose from 'mongoose';

// Type definitions for insert operations
export type InsertUser = Prisma.UserCreateInput;
export type InsertCategory = { name: string };
export type InsertMenuItem = { 
  name: string; 
  price: number; 
  categoryId?: string; 
  available?: boolean; 
  stock?: number; 
  description?: string; 
  addOns?: string; 
  isVegetarian?: boolean; 
  isMarkable?: boolean;
  isTrending?: boolean 
};
export type InsertOrder = { 
  orderNumber: string; 
  customerId?: number; 
  customerName: string; 
  items: string; 
  amount: number; 
  status?: string; 
  estimatedTime?: number; 
  barcode: string;
  seenBy?: number[]
};
export type InsertNotification = { type: string; message: string; read?: boolean };
export type InsertLoginIssue = { 
  name: string; 
  email?: string; 
  phoneNumber?: string; 
  registerNumber?: string; 
  staffId?: string; 
  issueType: string; 
  description: string; 
  status?: string 
};
export type InsertQuickOrder = { menuItemId: string; position: number; isActive?: boolean };
export type InsertPayment = { 
  orderId?: string | null; 
  merchantTransactionId: string; 
  phonePeTransactionId?: string; 
  amount: number; 
  status?: string; 
  paymentMethod?: string; 
  responseCode?: string; 
  responseMessage?: string; 
  checksum?: string; 
  metadata?: string 
};
export type InsertComplaint = { 
  subject: string; 
  description: string; 
  userId?: number; 
  userName: string; 
  userEmail?: string; 
  category?: string; 
  priority?: string; 
  status?: string; 
  orderId?: string; 
  adminNotes?: string; 
  resolvedBy?: string 
};

export type InsertCoupon = {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit: number;
  isActive?: boolean;
  validFrom: Date;
  validUntil: Date;
  createdBy: number;
};

// Convert MongoDB document to plain object
function mongoToPlain<T>(doc: any): T {
  if (!doc) return doc;
  if (Array.isArray(doc)) {
    return doc.map(item => mongoToPlain(item)) as any;
  }
  const obj = doc.toObject ? doc.toObject() : doc;
  if (obj._id) {
    obj.id = obj._id.toString();
    delete obj._id;
  }
  if (obj.__v !== undefined) {
    delete obj.__v;
  }
  return obj;
}

export interface IStorage {
  // Users (PostgreSQL)
  getAllUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByRegisterNumber(registerNumber: string): Promise<User | undefined>;
  getUserByStaffId(staffId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  updateUserEmail(id: number, email: string): Promise<User | undefined>;
  updateUserRole(id: number, role: string): Promise<User | null>;
  blockUser(id: number): Promise<User | null>;
  unblockUser(id: number): Promise<User | null>;
  deleteUser(id: number): Promise<void>;
  deleteAllUsers(): Promise<void>;
  
  // User-specific data methods for admin panel
  getUserOrders(userId: number): Promise<any[]>;
  getUserPayments(userId: number): Promise<any[]>;
  getComplaintsByUser(userId: number): Promise<any[]>;
  
  // Categories (MongoDB)
  getCategories(): Promise<any[]>;
  createCategory(category: InsertCategory): Promise<any>;
  deleteCategory(id: string): Promise<void>;
  
  // Menu Items (MongoDB)
  getMenuItems(): Promise<any[]>;
  getMenuItem(id: string): Promise<any | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<any>;
  updateMenuItem(id: string, item: Partial<InsertMenuItem>): Promise<any>;
  deleteMenuItem(id: string): Promise<void>;
  
  // Orders (MongoDB)
  getOrders(): Promise<any[]>;
  getOrdersPaginated(page: number, limit: number): Promise<{ orders: any[], totalCount: number, totalPages: number, currentPage: number }>;
  searchOrders(query: string, page: number, limit: number): Promise<{ orders: any[], totalCount: number, totalPages: number, currentPage: number }>;
  getOrder(id: string): Promise<any | undefined>;
  getOrderByBarcode(barcode: string): Promise<any | undefined>;
  getOrderByOrderNumber(orderNumber: string): Promise<any | undefined>;
  createOrder(order: InsertOrder): Promise<any>;
  updateOrder(id: string, order: Partial<InsertOrder & { deliveredAt?: Date; barcodeUsed?: boolean; seenBy?: number[] }>): Promise<any>;
  
  // Notifications (MongoDB)
  getNotifications(): Promise<any[]>;
  createNotification(notification: InsertNotification): Promise<any>;
  updateNotification(id: string, notification: Partial<InsertNotification>): Promise<any>;
  deleteNotification(id: string): Promise<void>;
  
  // Login Issues (MongoDB)
  getLoginIssues(): Promise<any[]>;
  getLoginIssue(id: string): Promise<any | undefined>;
  createLoginIssue(issue: InsertLoginIssue): Promise<any>;
  updateLoginIssue(id: string, issue: Partial<any>): Promise<any>;
  deleteLoginIssue(id: string): Promise<void>;
  
  // Quick Orders (MongoDB)
  getQuickOrders(): Promise<any[]>;
  createQuickOrder(quickOrder: InsertQuickOrder): Promise<any>;
  updateQuickOrder(id: string, quickOrder: Partial<InsertQuickOrder>): Promise<any>;
  deleteQuickOrder(id: string): Promise<void>;
  
  // Payments (MongoDB)
  getPayments(): Promise<any[]>;
  getPaymentsPaginated(page: number, limit: number, searchQuery?: string, statusFilter?: string): Promise<{ payments: any[], totalCount: number, totalPages: number, currentPage: number }>;
  getPayment(id: string): Promise<any | undefined>;
  getPaymentByMerchantTxnId(merchantTransactionId: string): Promise<any | undefined>;
  createPayment(payment: InsertPayment): Promise<any>;
  updatePayment(id: string, payment: Partial<InsertPayment>): Promise<any>;
  updatePaymentByMerchantTxnId(merchantTransactionId: string, payment: Partial<InsertPayment>): Promise<any | undefined>;

  // Complaints (MongoDB)
  getComplaints(): Promise<any[]>;
  getComplaint(id: string): Promise<any | undefined>;
  createComplaint(complaint: InsertComplaint): Promise<any>;
  updateComplaint(id: string, complaint: Partial<any>): Promise<any>;
  deleteComplaint(id: string): Promise<void>;

  // Coupons (MongoDB)
  getCoupons(): Promise<any[]>;
  getActiveCoupons(): Promise<any[]>;
  getCoupon(id: string): Promise<any | undefined>;
  createCoupon(coupon: InsertCoupon): Promise<any>;
  updateCoupon(id: string, coupon: Partial<any>): Promise<any>;
  deleteCoupon(id: string): Promise<boolean>;
  toggleCouponStatus(id: string): Promise<any>;
  validateCoupon(code: string, userId?: number, orderAmount?: number): Promise<{
    valid: boolean;
    message: string;
    coupon?: any;
    discountAmount?: number;
  }>;
  applyCoupon(code: string, userId: number, orderAmount: number): Promise<{
    success: boolean;
    message: string;
    discountAmount?: number;
    finalAmount?: number;
  }>;

  // Maintenance Notice operations (MongoDB)
}

export class HybridStorage implements IStorage {
  constructor() {
    // Initialize MongoDB connection
    connectToMongoDB().catch(console.error);
  }

  // USER OPERATIONS (PostgreSQL)
  async getAllUsers(): Promise<User[]> {
    const db = getPostgresDb();
    const users = await db.user.findMany({
      orderBy: { id: 'asc' }
    });
    return users;
  }

  async getUser(id: number): Promise<User | undefined> {
    const db = getPostgresDb();
    const user = await db.user.findUnique({
      where: { id }
    });
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const db = getPostgresDb();
    const user = await db.user.findUnique({
      where: { email }
    });
    return user || undefined;
  }

  async getUserByRegisterNumber(registerNumber: string): Promise<User | undefined> {
    const db = getPostgresDb();
    // Case-insensitive search for register number
    const user = await db.user.findFirst({
      where: { 
        registerNumber: {
          equals: registerNumber,
          mode: 'insensitive'
        }
      }
    });
    return user || undefined;
  }

  async getUserByStaffId(staffId: string): Promise<User | undefined> {
    const db = getPostgresDb();
    // Case-insensitive search for staff ID
    const user = await db.user.findFirst({
      where: { 
        staffId: {
          equals: staffId,
          mode: 'insensitive'
        }
      }
    });
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const db = getPostgresDb();
    
    // Normalize register number and staff ID to uppercase for consistency
    const normalizedUser = {
      ...insertUser,
      registerNumber: insertUser.registerNumber?.toUpperCase(),
      staffId: insertUser.staffId?.toUpperCase()
    };
    
    const user = await db.user.create({
      data: normalizedUser
    });
    return user;
  }

  async updateUser(id: number, updateData: Partial<InsertUser>): Promise<User> {
    const db = getPostgresDb();
    const user = await db.user.update({
      where: { id },
      data: updateData
    });
    return user;
  }

  async updateUserEmail(id: number, email: string): Promise<User | undefined> {
    const db = getPostgresDb();
    try {
      const user = await db.user.update({
        where: { id },
        data: { email }
      });
      return user;
    } catch (error) {
      return undefined;
    }
  }

  async deleteUser(id: number): Promise<void> {
    const db = getPostgresDb();
    await db.user.delete({
      where: { id }
    });
  }

  async deleteAllUsers(): Promise<void> {
    const db = getPostgresDb();
    await db.user.deleteMany();
  }

  // CATEGORY OPERATIONS (MongoDB)
  async getCategories(): Promise<any[]> {
    const categories = await Category.find().sort({ name: 1 });
    return mongoToPlain(categories);
  }

  async createCategory(category: InsertCategory): Promise<any> {
    const newCategory = new Category(category);
    const saved = await newCategory.save();
    return mongoToPlain(saved);
  }

  async deleteCategory(id: string): Promise<void> {
    await Category.findByIdAndDelete(id);
  }

  // MENU ITEM OPERATIONS (MongoDB)
  async getMenuItems(): Promise<any[]> {
    const menuItems = await MenuItem.find().sort({ name: 1 });
    return mongoToPlain(menuItems);
  }

  async getMenuItem(id: string): Promise<any | undefined> {
    const item = await MenuItem.findById(id);
    return item ? mongoToPlain(item) : undefined;
  }

  async createMenuItem(item: InsertMenuItem): Promise<any> {
    const newItem = new MenuItem(item);
    const saved = await newItem.save();
    return mongoToPlain(saved);
  }

  async updateMenuItem(id: string, item: Partial<InsertMenuItem>): Promise<any> {
    const updatedItem = await MenuItem.findByIdAndUpdate(id, item, { new: true });
    return mongoToPlain(updatedItem);
  }

  async deleteMenuItem(id: string): Promise<void> {
    await MenuItem.findByIdAndDelete(id);
  }

  // ORDER OPERATIONS (MongoDB)
  async getOrders(): Promise<any[]> {
    const orders = await Order.find().sort({ createdAt: -1 });
    return mongoToPlain(orders);
  }

  async getOrdersPaginated(page: number = 1, limit: number = 15): Promise<{ orders: any[], totalCount: number, totalPages: number, currentPage: number }> {
    const skip = (page - 1) * limit;
    const [orders, totalCount] = await Promise.all([
      Order.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments()
    ]);
    
    return {
      orders: mongoToPlain(orders),
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page
    };
  }

  async getActiveOrdersPaginated(page: number = 1, limit: number = 15): Promise<{ orders: any[], totalCount: number, totalPages: number, currentPage: number }> {
    const skip = (page - 1) * limit;
    const activeStatusFilter = { status: { $in: ['pending', 'preparing', 'ready'] } };
    
    const [orders, totalCount] = await Promise.all([
      Order.find(activeStatusFilter).sort({ createdAt: 1 }).skip(skip).limit(limit), // FIFO - oldest first
      Order.countDocuments(activeStatusFilter)
    ]);
    
    return {
      orders: mongoToPlain(orders),
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page
    };
  }

  async searchOrders(query: string, page: number = 1, limit: number = 15): Promise<{ orders: any[], totalCount: number, totalPages: number, currentPage: number }> {
    const skip = (page - 1) * limit;
    
    // Create a comprehensive search filter
    const searchFilter = {
      $or: [
        { orderNumber: { $regex: query, $options: 'i' } },
        { customerName: { $regex: query, $options: 'i' } },
        { items: { $regex: query, $options: 'i' } }, // Search in items JSON string
        { barcode: { $regex: query, $options: 'i' } }
      ]
    };
    
    const [orders, totalCount] = await Promise.all([
      Order.find(searchFilter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments(searchFilter)
    ]);
    
    return {
      orders: mongoToPlain(orders),
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page
    };
  }

  async getOrder(id: string): Promise<any | undefined> {
    const order = await Order.findById(id);
    return order ? mongoToPlain(order) : undefined;
  }

  async createOrder(order: InsertOrder): Promise<any> {
    const newOrder = new Order(order);
    const saved = await newOrder.save();
    return mongoToPlain(saved);
  }

  async updateOrder(id: string, order: Partial<InsertOrder & { deliveredAt?: Date; barcodeUsed?: boolean }>): Promise<any> {
    const updatedOrder = await Order.findByIdAndUpdate(id, order, { new: true });
    return mongoToPlain(updatedOrder);
  }

  async getOrderByBarcode(barcode: string): Promise<any | undefined> {
    const order = await Order.findOne({ barcode });
    return order ? mongoToPlain(order) : undefined;
  }

  async getOrderByOrderNumber(orderNumber: string): Promise<any | undefined> {
    const order = await Order.findOne({ orderNumber });
    return order ? mongoToPlain(order) : undefined;
  }

  // NOTIFICATION OPERATIONS (MongoDB)
  async getNotifications(): Promise<any[]> {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    return mongoToPlain(notifications);
  }

  async createNotification(notification: InsertNotification): Promise<any> {
    const newNotification = new Notification(notification);
    const saved = await newNotification.save();
    return mongoToPlain(saved);
  }

  async updateNotification(id: string, notification: Partial<InsertNotification>): Promise<any> {
    const updatedNotification = await Notification.findByIdAndUpdate(id, notification, { new: true });
    return mongoToPlain(updatedNotification);
  }

  async deleteNotification(id: string): Promise<void> {
    await Notification.findByIdAndDelete(id);
  }

  // LOGIN ISSUE OPERATIONS (MongoDB)
  async getLoginIssues(): Promise<any[]> {
    const issues = await LoginIssue.find().sort({ createdAt: -1 });
    return mongoToPlain(issues);
  }

  async getLoginIssue(id: string): Promise<any | undefined> {
    const issue = await LoginIssue.findById(id);
    return issue ? mongoToPlain(issue) : undefined;
  }

  async createLoginIssue(issue: InsertLoginIssue): Promise<any> {
    const newIssue = new LoginIssue(issue);
    const saved = await newIssue.save();
    return mongoToPlain(saved);
  }

  async updateLoginIssue(id: string, updateData: Partial<any>): Promise<any> {
    const updatedIssue = await LoginIssue.findByIdAndUpdate(id, updateData, { new: true });
    return mongoToPlain(updatedIssue);
  }

  async deleteLoginIssue(id: string): Promise<void> {
    await LoginIssue.findByIdAndDelete(id);
  }

  // QUICK ORDER OPERATIONS (MongoDB)
  async getQuickOrders(): Promise<any[]> {
    const quickOrders = await QuickOrder.find({ isActive: true })
      .populate('menuItemId')
      .sort({ position: 1 });
    
    return mongoToPlain(quickOrders.map((qo: any) => ({
      id: qo._id.toString(),
      menuItemId: qo.menuItemId._id.toString(),
      position: qo.position,
      isActive: qo.isActive,
      createdAt: qo.createdAt,
      menuItem: mongoToPlain(qo.menuItemId)
    })));
  }

  async createQuickOrder(quickOrder: InsertQuickOrder): Promise<any> {
    const newQuickOrder = new QuickOrder({
      ...quickOrder,
      menuItemId: new mongoose.Types.ObjectId(quickOrder.menuItemId)
    });
    const saved = await newQuickOrder.save();
    await saved.populate('menuItemId');
    return mongoToPlain({
      id: (saved._id as any).toString(),
      menuItemId: (saved.menuItemId as any)._id.toString(),
      position: saved.position,
      isActive: saved.isActive,
      createdAt: saved.createdAt,
      menuItem: mongoToPlain(saved.menuItemId)
    });
  }

  async updateQuickOrder(id: string, quickOrder: Partial<InsertQuickOrder>): Promise<any> {
    const updateData = {
      ...quickOrder,
      ...(quickOrder.menuItemId && { menuItemId: new mongoose.Types.ObjectId(quickOrder.menuItemId) })
    };
    const updatedQuickOrder = await QuickOrder.findByIdAndUpdate(id, updateData, { new: true })
      .populate('menuItemId');
    
    if (!updatedQuickOrder) {
      throw new Error('QuickOrder not found');
    }
    
    return mongoToPlain({
      id: (updatedQuickOrder._id as any).toString(),
      menuItemId: (updatedQuickOrder.menuItemId as any)._id.toString(),
      position: updatedQuickOrder.position,
      isActive: updatedQuickOrder.isActive,
      createdAt: updatedQuickOrder.createdAt,
      menuItem: mongoToPlain(updatedQuickOrder.menuItemId)
    });
  }

  async deleteQuickOrder(id: string): Promise<void> {
    const result = await QuickOrder.findByIdAndDelete(id);
    if (!result) {
      throw new Error(`QuickOrder with id ${id} not found`);
    }
  }

  // PAYMENT OPERATIONS (MongoDB)
  async getPayments(): Promise<any[]> {
    const payments = await Payment.find().sort({ createdAt: -1 });
    return mongoToPlain(payments);
  }

  async getPaymentsPaginated(page: number, limit: number, searchQuery?: string, statusFilter?: string): Promise<{ payments: any[], totalCount: number, totalPages: number, currentPage: number }> {
    const skip = (page - 1) * limit;
    
    // Build search filter
    let filter: any = {};
    
    // Status filter
    if (statusFilter && statusFilter !== 'all') {
      filter.status = { $regex: new RegExp(statusFilter, 'i') };
    }
    
    // Search query filter
    if (searchQuery && searchQuery.trim()) {
      const searchRegex = new RegExp(searchQuery.trim(), 'i');
      filter.$or = [
        { merchantTransactionId: searchRegex },
        { phonePeTransactionId: searchRegex },
        { paymentMethod: searchRegex },
        { responseCode: searchRegex },
        { responseMessage: searchRegex }
      ];
    }
    
    const [payments, totalCount] = await Promise.all([
      Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Payment.countDocuments(filter)
    ]);
    
    const totalPages = Math.ceil(totalCount / limit);
    
    return {
      payments: mongoToPlain(payments),
      totalCount,
      totalPages,
      currentPage: page
    };
  }

  async getPayment(id: string): Promise<any | undefined> {
    const payment = await Payment.findById(id);
    return payment ? mongoToPlain(payment) : undefined;
  }

  async getPaymentByMerchantTxnId(merchantTransactionId: string): Promise<any | undefined> {
    const payment = await Payment.findOne({ merchantTransactionId });
    return payment ? mongoToPlain(payment) : undefined;
  }

  async createPayment(payment: InsertPayment): Promise<any> {
    const newPayment = new Payment(payment);
    const saved = await newPayment.save();
    return mongoToPlain(saved);
  }

  async updatePayment(id: string, payment: Partial<InsertPayment>): Promise<any> {
    const updatedPayment = await Payment.findByIdAndUpdate(
      id, 
      { ...payment, updatedAt: new Date() }, 
      { new: true }
    );
    return mongoToPlain(updatedPayment);
  }

  async updatePaymentByMerchantTxnId(merchantTransactionId: string, payment: Partial<InsertPayment>): Promise<any | undefined> {
    try {
      const updatedPayment = await Payment.findOneAndUpdate(
        { merchantTransactionId },
        { ...payment, updatedAt: new Date() },
        { new: true }
      );
      return updatedPayment ? mongoToPlain(updatedPayment) : undefined;
    } catch (error) {
      return undefined;
    }
  }

  // Complaint methods
  async createComplaint(complaintData: InsertComplaint): Promise<any> {
    const complaint = new Complaint(complaintData);
    const saved = await complaint.save();
    return mongoToPlain(saved);
  }

  async getComplaints(): Promise<any[]> {
    const complaints = await Complaint.find().sort({ createdAt: -1 });
    return mongoToPlain(complaints);
  }

  async getComplaint(id: string): Promise<any | undefined> {
    const complaint = await Complaint.findById(id);
    return complaint ? mongoToPlain(complaint) : undefined;
  }

  async updateComplaint(id: string, updateData: Partial<InsertComplaint>): Promise<any | undefined> {
    const complaint = await Complaint.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );
    return complaint ? mongoToPlain(complaint) : undefined;
  }

  async deleteComplaint(id: string): Promise<any | undefined> {
    const result = await Complaint.findByIdAndDelete(id);
    return result ? mongoToPlain(result) : undefined;
  }

  async getComplaintsByStatus(status: string): Promise<any[]> {
    const complaints = await Complaint.find({ status }).sort({ createdAt: -1 });
    return mongoToPlain(complaints);
  }

  async getComplaintsByUser(userId: number): Promise<any[]> {
    const complaints = await Complaint.find({ userId }).sort({ createdAt: -1 });
    return mongoToPlain(complaints);
  }

  // Additional user-specific methods for admin panel
  async getUserOrders(userId: number): Promise<any[]> {
    const orders = await Order.find({ customerId: userId }).sort({ createdAt: -1 });
    return mongoToPlain(orders);
  }

  async getUserPayments(userId: number): Promise<any[]> {
    // Get orders for the user first, then get payments for those orders
    const userOrders = await Order.find({ customerId: userId }, { _id: 1 });
    const orderIds = userOrders.map(order => order._id);
    const payments = await Payment.find({ orderId: { $in: orderIds } }).sort({ createdAt: -1 });
    return mongoToPlain(payments);
  }

  async updateUserRole(id: number, role: string): Promise<User | null> {
    const db = getPostgresDb();
    return await db.user.update({
      where: { id },
      data: { role }
    });
  }

  async blockUser(id: number): Promise<User | null> {
    // For now, we'll use a role-based approach for blocking
    const db = getPostgresDb();
    const user = await db.user.findUnique({ where: { id } });
    if (!user) return null;
    
    return await db.user.update({
      where: { id },
      data: { role: 'blocked_' + user.role } // Prefix role with 'blocked_'
    });
  }

  async unblockUser(id: number): Promise<User | null> {
    const db = getPostgresDb();
    const user = await db.user.findUnique({ where: { id } });
    if (!user) return null;
    
    // Remove 'blocked_' prefix if it exists
    const unblocked_role = user.role?.startsWith('blocked_') 
      ? user.role.replace('blocked_', '')
      : user.role;
      
    return await db.user.update({
      where: { id },
      data: { role: unblocked_role }
    });
  }

  // ===========================================
  // COUPON METHODS (MongoDB)
  // ===========================================

  async getCoupons(): Promise<any[]> {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    return mongoToPlain(coupons);
  }

  async getActiveCoupons(): Promise<any[]> {
    const now = new Date();
    const coupons = await Coupon.find({
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
      $expr: { $lt: ['$usedCount', '$usageLimit'] }
    }).sort({ createdAt: -1 });
    return mongoToPlain(coupons);
  }

  async getCoupon(id: string): Promise<any | undefined> {
    const coupon = await Coupon.findById(id);
    return coupon ? mongoToPlain(coupon) : undefined;
  }

  async createCoupon(couponData: InsertCoupon): Promise<any> {
    const coupon = new Coupon({
      ...couponData,
      usedCount: 0,
      usedBy: [],
      usageHistory: [],
      assignmentType: (couponData as any).assignmentType || 'all',
      assignedUsers: (couponData as any).assignedUsers || [],
      isActive: couponData.isActive ?? true
    });
    const saved = await coupon.save();
    return mongoToPlain(saved);
  }

  async updateCoupon(id: string, updateData: Partial<any>): Promise<any | undefined> {
    const coupon = await Coupon.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    return coupon ? mongoToPlain(coupon) : undefined;
  }

  async deleteCoupon(id: string): Promise<boolean> {
    const result = await Coupon.findByIdAndDelete(id);
    return !!result;
  }

  async toggleCouponStatus(id: string): Promise<any | undefined> {
    const coupon = await Coupon.findById(id);
    if (!coupon) return undefined;
    
    coupon.isActive = !coupon.isActive;
    const saved = await coupon.save();
    return mongoToPlain(saved);
  }

  async validateCoupon(code: string, userId?: number, orderAmount?: number): Promise<{
    valid: boolean;
    message: string;
    coupon?: any;
    discountAmount?: number;
  }> {
    try {
      const coupon = await Coupon.findOne({ code });
      
      if (!coupon) {
        return { valid: false, message: 'Coupon not found' };
      }

      if (!coupon.isActive) {
        return { valid: false, message: 'Coupon is not active' };
      }

      // Check if coupon is assigned to specific users and user is authorized
      if (coupon.assignmentType === 'specific' && userId) {
        if (!coupon.assignedUsers.includes(userId)) {
          return { valid: false, message: 'This coupon is not assigned to you' };
        }
      }

      const now = new Date();
      if (now < coupon.validFrom) {
        return { valid: false, message: 'Coupon is not yet valid' };
      }

      if (now > coupon.validUntil) {
        return { valid: false, message: 'Coupon has expired' };
      }

      if (coupon.usedCount >= coupon.usageLimit) {
        return { valid: false, message: 'Coupon usage limit reached' };
      }

      if (userId && coupon.usedBy.includes(userId)) {
        return { valid: false, message: 'You have already used this coupon' };
      }

      if (orderAmount && coupon.minimumOrderAmount && orderAmount < coupon.minimumOrderAmount) {
        return { 
          valid: false, 
          message: `Minimum order amount of ₹${coupon.minimumOrderAmount} required` 
        };
      }

      let discountAmount = 0;
      if (orderAmount) {
        if (coupon.discountType === 'percentage') {
          discountAmount = (orderAmount * coupon.discountValue) / 100;
          if (coupon.maxDiscountAmount) {
            discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
          }
        } else {
          discountAmount = coupon.discountValue;
        }
        discountAmount = Math.min(discountAmount, orderAmount);
      }

      return {
        valid: true,
        message: 'Coupon is valid',
        coupon: mongoToPlain(coupon),
        discountAmount
      };
    } catch (error) {
      console.error('Error validating coupon:', error);
      return { valid: false, message: 'Error validating coupon' };
    }
  }

  async applyCoupon(code: string, userId: number, orderAmount: number, orderId?: string, orderNumber?: string): Promise<{
    success: boolean;
    message: string;
    discountAmount?: number;
    finalAmount?: number;
  }> {
    try {
      const validation = await this.validateCoupon(code, userId, orderAmount);
      
      if (!validation.valid) {
        return {
          success: false,
          message: validation.message
        };
      }

      const coupon = await Coupon.findOne({ code });
      if (!coupon) {
        return { success: false, message: 'Coupon not found' };
      }

      const discountAmount = validation.discountAmount || 0;
      const finalAmount = orderAmount - discountAmount;

      // Prepare usage history entry
      const usageHistoryEntry = {
        userId,
        orderId: orderId ? new mongoose.Types.ObjectId(orderId) : new mongoose.Types.ObjectId(),
        orderNumber: orderNumber || 'N/A',
        discountAmount,
        usedAt: new Date()
      };

      // Update coupon usage with detailed history
      await Coupon.findByIdAndUpdate(coupon._id, {
        $inc: { usedCount: 1 },
        $addToSet: { usedBy: userId },
        $push: { usageHistory: usageHistoryEntry }
      });

      return {
        success: true,
        message: 'Coupon applied successfully',
        discountAmount,
        finalAmount
      };
    } catch (error) {
      console.error('Error applying coupon:', error);
      return { success: false, message: 'Error applying coupon' };
    }
  }

  // New methods for enhanced coupon management
  async getCouponUsageDetails(couponId: string): Promise<{
    success: boolean;
    coupon?: any;
    usageDetails?: {
      totalUsed: number;
      usersWhoUsed: any[];
      usageHistory: any[];
      assignedUsers?: any[];
    };
  }> {
    try {
      const coupon = await Coupon.findById(couponId);
      if (!coupon) {
        return { success: false };
      }

      // Get user details for users who have used the coupon
      const usersWhoUsed = [];
      if (coupon.usedBy.length > 0) {
        const users = await this.getUsersByIds(coupon.usedBy);
        usersWhoUsed.push(...users);
      }

      // Get assigned user details if it's a specific assignment coupon
      let assignedUsers = [];
      if (coupon.assignmentType === 'specific' && coupon.assignedUsers.length > 0) {
        assignedUsers = await this.getUsersByIds(coupon.assignedUsers);
      }

      return {
        success: true,
        coupon: mongoToPlain(coupon),
        usageDetails: {
          totalUsed: coupon.usedCount,
          usersWhoUsed,
          usageHistory: coupon.usageHistory || [],
          assignedUsers
        }
      };
    } catch (error) {
      console.error('Error getting coupon usage details:', error);
      return { success: false };
    }
  }

  async assignCouponToUsers(couponId: string, userIds: number[]): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const coupon = await Coupon.findByIdAndUpdate(
        couponId,
        {
          assignmentType: 'specific',
          assignedUsers: userIds
        },
        { new: true }
      );

      if (!coupon) {
        return { success: false, message: 'Coupon not found' };
      }

      return {
        success: true,
        message: `Coupon assigned to ${userIds.length} user(s)`
      };
    } catch (error) {
      console.error('Error assigning coupon to users:', error);
      return { success: false, message: 'Error assigning coupon' };
    }
  }

  async getCouponsForUser(userId: number): Promise<any[]> {
    try {
      const now = new Date();
      
      // Find coupons assigned to this specific user or available to all
      const coupons = await Coupon.find({
        isActive: true,
        validFrom: { $lte: now },
        validUntil: { $gte: now },
        $expr: { $lt: ['$usedCount', '$usageLimit'] },
        $or: [
          { assignmentType: 'all' },
          { assignmentType: 'specific', assignedUsers: userId }
        ],
        usedBy: { $ne: userId } // Exclude already used coupons
      }).sort({ createdAt: -1 });
      
      return mongoToPlain(coupons);
    } catch (error) {
      console.error('Error getting coupons for user:', error);
      return [];
    }
  }

  async getUsersByIds(userIds: number[]): Promise<any[]> {
    try {
      const db = getPostgresDb();
      const users = await db.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          registerNumber: true,
          staffId: true,
          department: true,
          createdAt: true
        }
      });
      return users;
    } catch (error) {
      console.error('Error getting users by IDs:', error);
      return [];
    }
  }

  // DATABASE MANAGEMENT OPERATIONS
  
  /**
   * Get database statistics for admin dashboard
   */
  async getDatabaseStats() {
    try {
      const mongoStats = await this.getMongoDBStats();
      const pgStats = await this.getPostgreSQLStats();
      
      return {
        mongodb: mongoStats,
        postgresql: pgStats,
        totalSize: this.formatBytes((mongoStats.dataSize || 0) + (pgStats.size || 0)),
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      throw error;
    }
  }
  
  /**
   * Get MongoDB collection statistics
   */
  async getMongoDBStats() {
    try {
      // Use centralized connection check
      const { isMongoConnected } = await import('./mongodb');
      
      if (!isMongoConnected()) {
        throw new Error('MongoDB not connected');
      }
      
      // Wait for the db property to be available
      let retries = 0;
      while (!mongoose.connection.db && retries < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }
      
      if (!mongoose.connection.db) {
        throw new Error('MongoDB database not available');
      }
      
      const admin = mongoose.connection.db.admin();
      const dbStats = await admin.command({ dbStats: 1 });
      
      // Get collection stats (real-time data only)
      const collections = await mongoose.connection.db.listCollections().toArray();
      const collectionStats = [];
      
      for (const collection of collections) {
        try {
          const stats = await mongoose.connection.db.command({ collStats: collection.name });
          const count = await mongoose.connection.db.collection(collection.name).countDocuments();
          
          collectionStats.push({
            name: collection.name,
            count: count,
            size: stats.size || 0,
            storageSize: stats.storageSize || 0,
            avgObjSize: stats.avgObjSize || 0,
            indexes: stats.nindexes || 0
          });
        } catch (err) {
          console.warn(`Could not get stats for collection ${collection.name}:`, err instanceof Error ? err.message : String(err));
        }
      }
      
      return {
        dataSize: dbStats.dataSize || 0,
        storageSize: dbStats.storageSize || 0,
        indexSize: dbStats.indexSize || 0,
        collections: collectionStats,
        totalCollections: collections.length,
        totalDocuments: collectionStats.reduce((sum, col) => sum + col.count, 0)
      };
    } catch (error) {
      console.error('Error getting MongoDB stats:', error);
      // Don't return dummy data - throw error to indicate real data is not available
      throw new Error(`Cannot fetch real-time MongoDB data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Get PostgreSQL database statistics
   */
  async getPostgreSQLStats() {
    try {
      const db = getPostgresDb();
      
      // Get database size
      const sizeResult = await db.$queryRaw`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size,
               pg_database_size(current_database()) as size_bytes
      ` as Array<{ size: string; size_bytes: bigint }>;
      
      // Get table statistics
      const tableStats = await db.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public'
        ORDER BY tablename, attname
      ` as Array<any>;
      
      // Get user count
      const userCount = await db.user.count();
      
      return {
        size: Number(sizeResult[0]?.size_bytes || 0),
        sizeFormatted: sizeResult[0]?.size || '0 bytes',
        tables: {
          users: {
            name: 'users',
            count: userCount,
            columns: tableStats.filter(stat => stat.tablename === 'users').length
          }
        },
        totalTables: 1,
        totalRecords: userCount
      };
    } catch (error) {
      console.error('Error getting PostgreSQL stats:', error);
      return {
        size: 0,
        sizeFormatted: '0 bytes',
        tables: {},
        totalTables: 0,
        totalRecords: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * Run database maintenance operations (alias for compatibility)
   */
  async runMaintenance(operations: string[]) {
    return this.runDatabaseMaintenance(operations);
  }

  /**
   * Run database maintenance operations
   */
  async runDatabaseMaintenance(operations: string[]) {
    const results = [];
    
    for (const operation of operations) {
      try {
        switch (operation) {
          case 'analyze_postgres':
            await this.analyzePostgreSQL();
            results.push({ operation, status: 'success', message: 'PostgreSQL analysis completed' });
            break;
            
          case 'compact_mongo':
            await this.compactMongoDB();
            results.push({ operation, status: 'success', message: 'MongoDB compaction initiated' });
            break;
            
          case 'rebuild_indexes':
            await this.rebuildMongoIndexes();
            results.push({ operation, status: 'success', message: 'MongoDB indexes rebuilt' });
            break;
            
          case 'vacuum_postgres':
            await this.vacuumPostgreSQL();
            results.push({ operation, status: 'success', message: 'PostgreSQL vacuum completed' });
            break;
            
          case 'optimize_postgres':
            await this.optimizePostgreSQL();
            results.push({ operation, status: 'success', message: 'PostgreSQL optimization completed' });
            break;
            
          case 'cleanup_mongo':
            await this.cleanupMongoDB();
            results.push({ operation, status: 'success', message: 'MongoDB cleanup completed' });
            break;
            
          case 'reindex_postgres':
            await this.reindexPostgreSQL();
            results.push({ operation, status: 'success', message: 'PostgreSQL reindexing completed' });
            break;
            
          case 'validate_mongo':
            await this.validateMongoCollections();
            results.push({ operation, status: 'success', message: 'MongoDB collections validated' });
            break;
            
          default:
            results.push({ operation, status: 'error', message: 'Unknown operation' });
        }
      } catch (error) {
        results.push({ 
          operation, 
          status: 'error', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    return results;
  }
  
  /**
   * Analyze PostgreSQL tables for optimization
   */
  private async analyzePostgreSQL() {
    const db = getPostgresDb();
    await db.$executeRaw`ANALYZE`;
  }
  
  /**
   * Vacuum PostgreSQL database
   */
  private async vacuumPostgreSQL() {
    const db = getPostgresDb();
    await db.$executeRaw`VACUUM ANALYZE`;
  }
  
  /**
   * Compact MongoDB collections
   */
  private async compactMongoDB() {
    if (!mongoose.connection.db) {
      throw new Error('MongoDB not connected');
    }
    
    // Get MongoDB version to check if compact is supported
    const admin = mongoose.connection.db.admin();
    const buildInfo = await admin.buildInfo();
    const version = buildInfo.version;
    const majorVersion = parseInt(version.split('.')[0]);
    
    if (majorVersion >= 4) {
      // Use compact command for MongoDB 4.0+
      const collections = await mongoose.connection.db.listCollections().toArray();
      
      for (const collection of collections) {
        try {
          await mongoose.connection.db.command({ compact: collection.name });
        } catch (error) {
          console.warn(`Could not compact collection ${collection.name}:`, error instanceof Error ? error.message : String(error));
        }
      }
    } else {
      console.log('MongoDB version does not support compact command');
    }
  }
  
  /**
   * Rebuild MongoDB indexes
   */
  private async rebuildMongoIndexes() {
    if (!mongoose.connection.db) {
      throw new Error('MongoDB not connected');
    }
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    for (const collection of collections) {
      try {
        await mongoose.connection.db.command({ reIndex: collection.name });
      } catch (error) {
        console.warn(`Could not rebuild indexes for collection ${collection.name}:`, error instanceof Error ? error.message : String(error));
      }
    }
  }
  
  /**
   * Optimize PostgreSQL database
   */
  private async optimizePostgreSQL() {
    const db = getPostgresDb();
    
    try {
      // Run full vacuum and analyze
      await db.$executeRaw`VACUUM FULL ANALYZE`;
      
      // Update table statistics
      await db.$executeRaw`ANALYZE`;
      
      // Recompute table statistics
      await db.$executeRaw`
        UPDATE pg_stat_user_tables 
        SET last_analyze = NOW() 
        WHERE schemaname = 'public'
      `;
    } catch (error) {
      console.warn('Some PostgreSQL optimization operations failed:', error instanceof Error ? error.message : String(error));
      // Fallback to basic operations if full optimization fails
      await db.$executeRaw`VACUUM ANALYZE`;
    }
  }
  
  /**
   * Clean up MongoDB collections
   */
  private async cleanupMongoDB() {
    if (!mongoose.connection.db) {
      throw new Error('MongoDB not connected');
    }
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    for (const collection of collections) {
      try {
        const collectionObj = mongoose.connection.db.collection(collection.name);
        
        // Remove documents with null or undefined critical fields (if any)
        // This is a basic cleanup - in a real app you'd have specific cleanup rules
        const result = await collectionObj.deleteMany({
          $or: [
            { _id: { $type: 10 } }, // BSON null type
            { _id: { $exists: false } }
          ]
        });
        
        if (result.deletedCount > 0) {
          console.log(`Cleaned up ${result.deletedCount} invalid documents from ${collection.name}`);
        }
      } catch (error) {
        console.warn(`Could not clean up collection ${collection.name}:`, error instanceof Error ? error.message : String(error));
      }
    }
  }
  
  /**
   * Reindex PostgreSQL database
   */
  private async reindexPostgreSQL() {
    const db = getPostgresDb();
    
    try {
      // Reindex all indexes in the database
      await db.$executeRaw`REINDEX DATABASE CURRENT_DATABASE()`;
    } catch (error) {
      console.warn('Full database reindex failed, trying table-level reindex:', error instanceof Error ? error.message : String(error));
      
      try {
        // Fallback to reindexing specific tables
        await db.$executeRaw`REINDEX TABLE "User"`;
      } catch (fallbackError) {
        console.warn('Table-level reindex also failed:', fallbackError instanceof Error ? fallbackError.message : String(fallbackError));
        throw new Error('PostgreSQL reindexing failed');
      }
    }
  }
  
  /**
   * Validate MongoDB collections
   */
  private async validateMongoCollections() {
    if (!mongoose.connection.db) {
      throw new Error('MongoDB not connected');
    }
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    const validationResults = [];
    
    for (const collection of collections) {
      try {
        const result = await mongoose.connection.db.command({ 
          validate: collection.name,
          full: false // Set to true for more thorough validation (slower)
        });
        
        validationResults.push({
          collection: collection.name,
          valid: result.valid,
          warnings: result.warnings || [],
          errors: result.errors || []
        });
        
        if (!result.valid) {
          console.warn(`Collection ${collection.name} validation failed:`, result);
        }
      } catch (error) {
        console.warn(`Could not validate collection ${collection.name}:`, error instanceof Error ? error.message : String(error));
        validationResults.push({
          collection: collection.name,
          valid: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return validationResults;
  }
  
  /**
   * Create database backup metadata
   */
  async createBackupMetadata(type: 'mongodb' | 'postgresql' | 'full') {
    const timestamp = new Date().toISOString();
    const metadata = {
      id: `backup_${Date.now()}`,
      type,
      timestamp,
      status: 'initiated',
      size: 0,
      collections: [] as string[],
      tables: [] as string[]
    };
    
    if (type === 'mongodb' || type === 'full') {
      const mongoStats = await this.getMongoDBStats();
      metadata.collections = mongoStats.collections.map(c => c.name);
      metadata.size += mongoStats.dataSize;
    }
    
    if (type === 'postgresql' || type === 'full') {
      const pgStats = await this.getPostgreSQLStats();
      metadata.tables = Object.keys(pgStats.tables);
      metadata.size += pgStats.size;
    }
    
    return metadata;
  }

  // BACKUP AND RESTORE OPERATIONS
  
  /**
   * Create database backup
   */
  async createBackup(type: 'mongodb' | 'postgresql' | 'full') {
    const timestamp = new Date().toISOString();
    const backupId = `backup_${Date.now()}`;
    
    try {
      let backupData: any = {
        id: backupId,
        type,
        timestamp,
        status: 'in_progress',
        data: {}
      };
      
      if (type === 'mongodb' || type === 'full') {
        // MongoDB backup
        const mongoBackup = await this.createMongoBackup();
        backupData.data.mongodb = mongoBackup;
      }
      
      if (type === 'postgresql' || type === 'full') {
        // PostgreSQL backup
        const pgBackup = await this.createPostgreSQLBackup();
        backupData.data.postgresql = pgBackup;
      }
      
      backupData.status = 'completed';
      backupData.size = JSON.stringify(backupData.data).length;
      
      // Store backup metadata (in production, you'd store this in a proper backup storage)
      this.backupStorage.set(backupId, backupData);
      
      return {
        id: backupId,
        type,
        timestamp,
        status: 'completed',
        size: backupData.size
      };
    } catch (error) {
      console.error('Error creating backup:', error);
      throw new Error(`Failed to create ${type} backup: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private backupStorage = new Map<string, any>();
  
  /**
   * Create MongoDB backup
   */
  private async createMongoBackup() {
    const collections = await mongoose.connection.db?.listCollections().toArray() || [];
    const backup: any = {};
    
    for (const collection of collections) {
      try {
        const collectionData = await mongoose.connection.db?.collection(collection.name).find({}).toArray();
        backup[collection.name] = collectionData;
      } catch (error) {
        console.warn(`Could not backup collection ${collection.name}:`, error instanceof Error ? error.message : String(error));
        backup[collection.name] = [];
      }
    }
    
    return backup;
  }
  
  /**
   * Create PostgreSQL backup
   */
  private async createPostgreSQLBackup() {
    const db = getPostgresDb();
    const backup: any = {};
    
    try {
      // Get all users (this is the main table we have)
      const users = await db.user.findMany();
      backup.users = users;
      
      return backup;
    } catch (error) {
      console.error('Error creating PostgreSQL backup:', error);
      throw error;
    }
  }
  
  /**
   * Get backup list
   */
  async getBackupList() {
    const backups = Array.from(this.backupStorage.values()).map(backup => ({
      id: backup.id,
      type: backup.type,
      timestamp: backup.timestamp,
      status: backup.status,
      size: backup.size,
      filename: `${backup.id}_${backup.type}.json`
    }));
    
    return backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  
  /**
   * Get backup info
   */
  async getBackupInfo(backupId: string) {
    const backup = this.backupStorage.get(backupId);
    
    if (!backup) {
      return null;
    }
    
    return {
      id: backup.id,
      type: backup.type,
      timestamp: backup.timestamp,
      status: backup.status,
      size: backup.size,
      filename: `${backup.id}_${backup.type}.json`,
      filePath: `/tmp/${backup.id}_${backup.type}.json` // Simulated file path
    };
  }
  
  /**
   * Restore from backup
   */
  async restoreFromBackup(backupId: string, type?: string) {
    const backup = this.backupStorage.get(backupId);
    
    if (!backup) {
      throw new Error(`Backup ${backupId} not found`);
    }
    
    if (type && backup.type !== type && backup.type !== 'full') {
      throw new Error(`Backup type mismatch. Expected ${type}, got ${backup.type}`);
    }
    
    try {
      const results: any = {
        restored: [],
        errors: []
      };
      
      if (backup.data.mongodb && (type === 'mongodb' || type === 'full' || !type)) {
        try {
          await this.restoreMongoBackup(backup.data.mongodb);
          results.restored.push('mongodb');
        } catch (error) {
          results.errors.push(`MongoDB restore failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      if (backup.data.postgresql && (type === 'postgresql' || type === 'full' || !type)) {
        try {
          await this.restorePostgreSQLBackup(backup.data.postgresql);
          results.restored.push('postgresql');
        } catch (error) {
          results.errors.push(`PostgreSQL restore failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      return {
        backupId,
        timestamp: new Date().toISOString(),
        ...results
      };
    } catch (error) {
      console.error('Error restoring from backup:', error);
      throw new Error(`Failed to restore from backup: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Restore MongoDB backup
   */
  private async restoreMongoBackup(mongoData: any) {
    if (!mongoose.connection.db) {
      throw new Error('MongoDB not connected');
    }
    
    for (const [collectionName, data] of Object.entries(mongoData)) {
      try {
        const collection = mongoose.connection.db.collection(collectionName);
        
        // Clear existing data
        await collection.deleteMany({});
        
        // Insert backup data
        if (Array.isArray(data) && data.length > 0) {
          await collection.insertMany(data as any[]);
        }
      } catch (error) {
        console.warn(`Could not restore collection ${collectionName}:`, error instanceof Error ? error.message : String(error));
      }
    }
  }
  
  /**
   * Restore PostgreSQL backup
   */
  private async restorePostgreSQLBackup(pgData: any) {
    const db = getPostgresDb();
    
    try {
      if (pgData.users && Array.isArray(pgData.users)) {
        // Clear existing users
        await db.user.deleteMany();
        
        // Insert backup users
        for (const user of pgData.users) {
          try {
            await db.user.create({
              data: {
                email: user.email,
                name: user.name,
                registerNumber: user.registerNumber,
                staffId: user.staffId,
                role: user.role,
                department: user.department
              }
            });
          } catch (error) {
            console.warn(`Could not restore user ${user.email}:`, error instanceof Error ? error.message : String(error));
          }
        }
      }
    } catch (error) {
      console.error('Error restoring PostgreSQL data:', error);
      throw error;
    }
  }
  
  /**
   * Delete backup
   */
  async deleteBackup(backupId: string) {
    const backup = this.backupStorage.get(backupId);
    
    if (!backup) {
      throw new Error(`Backup ${backupId} not found`);
    }
    
    this.backupStorage.delete(backupId);
    
    return {
      deleted: true,
      backupId,
      timestamp: new Date().toISOString()
    };
  }

  // MAINTENANCE NOTICE OPERATIONS (MongoDB)

}

export const storage = new HybridStorage();