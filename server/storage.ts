import { PrismaClient } from '@prisma/client';
import type { 
  User, Category, MenuItem, Order, Notification, LoginIssue, QuickOrder, Payment,
  Prisma
} from '@prisma/client';
import { db as getDb } from "./db";

// Type definitions for insert operations
export type InsertUser = Prisma.UserCreateInput;
export type InsertCategory = Prisma.CategoryCreateInput;
export type InsertMenuItem = Prisma.MenuItemCreateInput;
export type InsertOrder = Prisma.OrderCreateInput;
export type InsertNotification = Prisma.NotificationCreateInput;
export type InsertLoginIssue = Prisma.LoginIssueCreateInput;
export type InsertQuickOrder = { menuItemId: number; position: number; isActive?: boolean };
export type InsertPayment = { orderId?: number | null; merchantTransactionId: string; phonePeTransactionId?: string; amount: number; status?: string; paymentMethod?: string; responseCode?: string; responseMessage?: string; checksum?: string; metadata?: string };

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByRegisterNumber(registerNumber: string): Promise<User | undefined>;
  getUserByStaffId(staffId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  updateUserEmail(id: number, email: string): Promise<User | undefined>;
  deleteAllUsers(): Promise<void>;
  
  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  deleteCategory(id: number): Promise<void>;
  
  // Menu Items
  getMenuItems(): Promise<MenuItem[]>;
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem>;
  deleteMenuItem(id: number): Promise<void>;
  
  // Orders
  getOrders(): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  getOrderByBarcode(barcode: string): Promise<Order | undefined>;
  getOrderByOrderNumber(orderNumber: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, order: Partial<InsertOrder & { deliveredAt?: Date; barcodeUsed?: boolean }>): Promise<Order>;
  
  // Notifications
  getNotifications(): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  updateNotification(id: number, notification: Partial<InsertNotification>): Promise<Notification>;
  deleteNotification(id: number): Promise<void>;
  
  // Login Issues
  getLoginIssues(): Promise<LoginIssue[]>;
  getLoginIssue(id: number): Promise<LoginIssue | undefined>;
  createLoginIssue(issue: InsertLoginIssue): Promise<LoginIssue>;
  updateLoginIssue(id: number, issue: Partial<LoginIssue>): Promise<LoginIssue>;
  deleteLoginIssue(id: number): Promise<void>;
  
  // Quick Orders
  getQuickOrders(): Promise<(QuickOrder & { menuItem: MenuItem })[]>;
  createQuickOrder(quickOrder: InsertQuickOrder): Promise<QuickOrder>;
  updateQuickOrder(id: number, quickOrder: Partial<InsertQuickOrder>): Promise<QuickOrder>;
  deleteQuickOrder(id: number): Promise<void>;
  
  // Payments
  getPayments(): Promise<Payment[]>;
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentByMerchantTxnId(merchantTransactionId: string): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment>;
  updatePaymentByMerchantTxnId(merchantTransactionId: string, payment: Partial<InsertPayment>): Promise<Payment | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const db = getDb();
    const user = await db.user.findUnique({
      where: { id }
    });
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const db = getDb();
    const user = await db.user.findUnique({
      where: { email }
    });
    return user || undefined;
  }

  async getUserByRegisterNumber(registerNumber: string): Promise<User | undefined> {
    const db = getDb();
    const user = await db.user.findUnique({
      where: { registerNumber }
    });
    return user || undefined;
  }

  async getUserByStaffId(staffId: string): Promise<User | undefined> {
    const db = getDb();
    const user = await db.user.findUnique({
      where: { staffId }
    });
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const db = getDb();
    const user = await db.user.create({
      data: insertUser
    });
    return user;
  }

  async updateUser(id: number, updateData: Partial<InsertUser>): Promise<User> {
    const db = getDb();
    const user = await db.user.update({
      where: { id },
      data: updateData
    });
    return user;
  }

  async updateUserEmail(id: number, email: string): Promise<User | undefined> {
    const db = getDb();
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
    const db = getDb();
    await db.user.deleteMany();
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    const db = getDb();
    return await db.category.findMany({
      orderBy: { name: 'asc' }
    });
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const db = getDb();
    const newCategory = await db.category.create({
      data: category
    });
    return newCategory;
  }

  async deleteCategory(id: number): Promise<void> {
    const db = getDb();
    await db.category.delete({
      where: { id }
    });
  }

  // Menu Items
  async getMenuItems(): Promise<MenuItem[]> {
    const db = getDb();
    return await db.menuItem.findMany({
      orderBy: { name: 'asc' }
    });
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    const db = getDb();
    const item = await db.menuItem.findUnique({
      where: { id }
    });
    return item || undefined;
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const db = getDb();
    const newItem = await db.menuItem.create({
      data: item
    });
    return newItem;
  }

  async updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem> {
    const db = getDb();
    const updatedItem = await db.menuItem.update({
      where: { id },
      data: item
    });
    return updatedItem;
  }

  async deleteMenuItem(id: number): Promise<void> {
    const db = getDb();
    await db.menuItem.delete({
      where: { id }
    });
  }

  // Orders
  async getOrders(): Promise<Order[]> {
    const db = getDb();
    return await db.order.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const db = getDb();
    const order = await db.order.findUnique({
      where: { id }
    });
    return order || undefined;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const db = getDb();
    const newOrder = await db.order.create({
      data: order
    });
    return newOrder;
  }

  async updateOrder(id: number, order: Partial<InsertOrder & { deliveredAt?: Date; barcodeUsed?: boolean }>): Promise<Order> {
    const db = getDb();
    const updatedOrder = await db.order.update({
      where: { id },
      data: order
    });
    return updatedOrder;
  }

  async getOrderByBarcode(barcode: string): Promise<Order | undefined> {
    const db = getDb();
    const order = await db.order.findUnique({
      where: { barcode }
    });
    return order || undefined;
  }

  async getOrderByOrderNumber(orderNumber: string): Promise<Order | undefined> {
    const db = getDb();
    const order = await db.order.findUnique({
      where: { orderNumber }
    });
    return order || undefined;
  }

  // Notifications
  async getNotifications(): Promise<Notification[]> {
    const db = getDb();
    return await db.notification.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const db = getDb();
    const newNotification = await db.notification.create({
      data: notification
    });
    return newNotification;
  }

  async updateNotification(id: number, notification: Partial<InsertNotification>): Promise<Notification> {
    const db = getDb();
    const updatedNotification = await db.notification.update({
      where: { id },
      data: notification
    });
    return updatedNotification;
  }

  async deleteNotification(id: number): Promise<void> {
    const db = getDb();
    await db.notification.delete({
      where: { id }
    });
  }

  // Login Issues
  async getLoginIssues(): Promise<LoginIssue[]> {
    const db = getDb();
    return await db.loginIssue.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async getLoginIssue(id: number): Promise<LoginIssue | undefined> {
    const db = getDb();
    const issue = await db.loginIssue.findUnique({
      where: { id }
    });
    return issue || undefined;
  }

  async createLoginIssue(issue: InsertLoginIssue): Promise<LoginIssue> {
    const db = getDb();
    const newIssue = await db.loginIssue.create({
      data: issue
    });
    return newIssue;
  }

  async updateLoginIssue(id: number, updateData: Partial<LoginIssue>): Promise<LoginIssue> {
    const db = getDb();
    const updatedIssue = await db.loginIssue.update({
      where: { id },
      data: updateData
    });
    return updatedIssue;
  }

  async deleteLoginIssue(id: number): Promise<void> {
    const db = getDb();
    await db.loginIssue.delete({
      where: { id }
    });
  }

  // Quick Orders
  async getQuickOrders(): Promise<(QuickOrder & { menuItem: MenuItem })[]> {
    const db = getDb();
    const result = await db.quickOrder.findMany({
      where: { isActive: true },
      include: { menuItem: true },
      orderBy: { position: 'asc' }
    });
    
    return result;
  }

  async createQuickOrder(quickOrder: InsertQuickOrder): Promise<QuickOrder> {
    const db = getDb();
    const newQuickOrder = await db.quickOrder.create({
      data: quickOrder
    });
    return newQuickOrder;
  }

  async updateQuickOrder(id: number, quickOrder: Partial<InsertQuickOrder>): Promise<QuickOrder> {
    const db = getDb();
    const updatedQuickOrder = await db.quickOrder.update({
      where: { id },
      data: quickOrder
    });
    return updatedQuickOrder;
  }

  async deleteQuickOrder(id: number): Promise<void> {
    const db = getDb();
    await db.quickOrder.delete({
      where: { id }
    });
  }

  // Payments
  async getPayments(): Promise<Payment[]> {
    const db = getDb();
    return await db.payment.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async getPayment(id: number): Promise<Payment | undefined> {
    const db = getDb();
    const payment = await db.payment.findUnique({
      where: { id }
    });
    return payment || undefined;
  }

  async getPaymentByMerchantTxnId(merchantTransactionId: string): Promise<Payment | undefined> {
    const db = getDb();
    const payment = await db.payment.findUnique({
      where: { merchantTransactionId }
    });
    return payment || undefined;
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const db = getDb();
    const newPayment = await db.payment.create({
      data: payment
    });
    return newPayment;
  }

  async updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment> {
    const db = getDb();
    const updatedPayment = await db.payment.update({
      where: { id },
      data: { ...payment, updatedAt: new Date() }
    });
    return updatedPayment;
  }

  async updatePaymentByMerchantTxnId(merchantTransactionId: string, payment: Partial<InsertPayment>): Promise<Payment | undefined> {
    const db = getDb();
    try {
      const updatedPayment = await db.payment.update({
        where: { merchantTransactionId },
        data: { ...payment, updatedAt: new Date() }
      });
      return updatedPayment;
    } catch (error) {
      return undefined;
    }
  }
}

export const storage = new DatabaseStorage();