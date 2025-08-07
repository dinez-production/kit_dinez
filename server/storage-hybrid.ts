import { PrismaClient } from '@prisma/client';
import type { User, Prisma } from '@prisma/client';
import { connectToMongoDB } from './mongodb';
import { 
  Category, MenuItem, Order, OrderItem, Notification, LoginIssue, QuickOrder, Payment,
  type ICategory, type IMenuItem, type IOrder, type IOrderItem, 
  type INotification, type ILoginIssue, type IQuickOrder, type IPayment
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
  barcode: string 
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
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByRegisterNumber(registerNumber: string): Promise<User | undefined>;
  getUserByStaffId(staffId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  updateUserEmail(id: number, email: string): Promise<User | undefined>;
  deleteAllUsers(): Promise<void>;
  
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
  getOrder(id: string): Promise<any | undefined>;
  getOrderByBarcode(barcode: string): Promise<any | undefined>;
  getOrderByOrderNumber(orderNumber: string): Promise<any | undefined>;
  createOrder(order: InsertOrder): Promise<any>;
  updateOrder(id: string, order: Partial<InsertOrder & { deliveredAt?: Date; barcodeUsed?: boolean }>): Promise<any>;
  
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
  getPayment(id: string): Promise<any | undefined>;
  getPaymentByMerchantTxnId(merchantTransactionId: string): Promise<any | undefined>;
  createPayment(payment: InsertPayment): Promise<any>;
  updatePayment(id: string, payment: Partial<InsertPayment>): Promise<any>;
  updatePaymentByMerchantTxnId(merchantTransactionId: string, payment: Partial<InsertPayment>): Promise<any | undefined>;
}

export class HybridStorage implements IStorage {
  constructor() {
    // Initialize MongoDB connection
    connectToMongoDB().catch(console.error);
  }

  // USER OPERATIONS (PostgreSQL)
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
    const user = await db.user.findUnique({
      where: { registerNumber }
    });
    return user || undefined;
  }

  async getUserByStaffId(staffId: string): Promise<User | undefined> {
    const db = getPostgresDb();
    const user = await db.user.findUnique({
      where: { staffId }
    });
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const db = getPostgresDb();
    const user = await db.user.create({
      data: insertUser
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
    await QuickOrder.findByIdAndDelete(id);
  }

  // PAYMENT OPERATIONS (MongoDB)
  async getPayments(): Promise<any[]> {
    const payments = await Payment.find().sort({ createdAt: -1 });
    return mongoToPlain(payments);
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
}

export const storage = new HybridStorage();