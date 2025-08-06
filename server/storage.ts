import { 
  users, categories, menuItems, orders, notifications, loginIssues, quickOrders, payments, pendingOrders,
  type User, type InsertUser,
  type Category, type InsertCategory,
  type MenuItem, type InsertMenuItem,
  type Order, type InsertOrder,
  type Notification, type InsertNotification,
  type LoginIssue, type InsertLoginIssue,
  type QuickOrder, type InsertQuickOrder,
  type Payment, type InsertPayment,
  type PendingOrder, type InsertPendingOrder
} from "@shared/schema";
import { db as getDb } from "./db";
import { eq, desc, lt } from "drizzle-orm";

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

  // Pending Orders
  getPendingOrders(): Promise<PendingOrder[]>;
  getPendingOrder(id: number): Promise<PendingOrder | undefined>;
  getPendingOrderByNumber(orderNumber: string): Promise<PendingOrder | undefined>;
  getPendingOrdersByCustomer(customerId: number): Promise<PendingOrder[]>;
  getPendingOrderByMerchantTxnId(merchantTransactionId: string): Promise<PendingOrder | undefined>;
  createPendingOrder(pendingOrder: InsertPendingOrder): Promise<PendingOrder>;
  updatePendingOrder(id: number, pendingOrder: Partial<PendingOrder>): Promise<PendingOrder>;
  deletePendingOrder(id: number): Promise<void>;
  getTimedOutPendingOrders(): Promise<PendingOrder[]>;

}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByRegisterNumber(registerNumber: string): Promise<User | undefined> {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.registerNumber, registerNumber));
    return user || undefined;
  }

  async getUserByStaffId(staffId: string): Promise<User | undefined> {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.staffId, staffId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const db = getDb();
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updateData: Partial<InsertUser>): Promise<User> {
    const db = getDb();
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserEmail(id: number, email: string): Promise<User | undefined> {
    const db = getDb();
    const [user] = await db
      .update(users)
      .set({ email })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteAllUsers(): Promise<void> {
    const db = getDb();
    await db.delete(users);
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    const db = getDb();
    return await db.select().from(categories).orderBy(categories.name);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const db = getDb();
    const [newCategory] = await db
      .insert(categories)
      .values(category)
      .returning();
    return newCategory;
  }

  async deleteCategory(id: number): Promise<void> {
    const db = getDb();
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Menu Items
  async getMenuItems(): Promise<MenuItem[]> {
    const db = getDb();
    return await db.select().from(menuItems).orderBy(menuItems.name);
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    const db = getDb();
    const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return item || undefined;
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const db = getDb();
    const [newItem] = await db
      .insert(menuItems)
      .values(item)
      .returning();
    return newItem;
  }

  async updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem> {
    const db = getDb();
    const [updatedItem] = await db
      .update(menuItems)
      .set(item)
      .where(eq(menuItems.id, id))
      .returning();
    return updatedItem;
  }

  async deleteMenuItem(id: number): Promise<void> {
    const db = getDb();
    await db.delete(menuItems).where(eq(menuItems.id, id));
  }

  // Orders
  async getOrders(): Promise<Order[]> {
    const db = getDb();
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const db = getDb();
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const db = getDb();
    const [newOrder] = await db
      .insert(orders)
      .values(order)
      .returning();
    return newOrder;
  }

  async updateOrder(id: number, order: Partial<InsertOrder & { deliveredAt?: Date; barcodeUsed?: boolean }>): Promise<Order> {
    const db = getDb();
    const [updatedOrder] = await db
      .update(orders)
      .set(order)
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  async getOrderByBarcode(barcode: string): Promise<Order | undefined> {
    const db = getDb();
    const [order] = await db.select().from(orders).where(eq(orders.barcode, barcode));
    return order || undefined;
  }

  async getOrderByOrderNumber(orderNumber: string): Promise<Order | undefined> {
    const db = getDb();
    const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber));
    return order || undefined;
  }

  // Notifications
  async getNotifications(): Promise<Notification[]> {
    const db = getDb();
    return await db.select().from(notifications).orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const db = getDb();
    const [newNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return newNotification;
  }

  async updateNotification(id: number, notification: Partial<InsertNotification>): Promise<Notification> {
    const db = getDb();
    const [updatedNotification] = await db
      .update(notifications)
      .set(notification)
      .where(eq(notifications.id, id))
      .returning();
    return updatedNotification;
  }

  async deleteNotification(id: number): Promise<void> {
    const db = getDb();
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  // Login Issues
  async getLoginIssues(): Promise<LoginIssue[]> {
    const db = getDb();
    return await db.select().from(loginIssues).orderBy(desc(loginIssues.createdAt));
  }

  async getLoginIssue(id: number): Promise<LoginIssue | undefined> {
    const db = getDb();
    const [issue] = await db.select().from(loginIssues).where(eq(loginIssues.id, id));
    return issue || undefined;
  }

  async createLoginIssue(issue: InsertLoginIssue): Promise<LoginIssue> {
    const db = getDb();
    const [newIssue] = await db
      .insert(loginIssues)
      .values(issue)
      .returning();
    return newIssue;
  }

  async updateLoginIssue(id: number, updateData: Partial<LoginIssue>): Promise<LoginIssue> {
    const db = getDb();
    const [updatedIssue] = await db
      .update(loginIssues)
      .set(updateData)
      .where(eq(loginIssues.id, id))
      .returning();
    return updatedIssue;
  }

  async deleteLoginIssue(id: number): Promise<void> {
    const db = getDb();
    await db.delete(loginIssues).where(eq(loginIssues.id, id));
  }

  // Quick Orders
  async getQuickOrders(): Promise<(QuickOrder & { menuItem: MenuItem })[]> {
    const db = getDb();
    const result = await db
      .select({
        id: quickOrders.id,
        menuItemId: quickOrders.menuItemId,
        position: quickOrders.position,
        isActive: quickOrders.isActive,
        createdAt: quickOrders.createdAt,
        menuItem: {
          id: menuItems.id,
          name: menuItems.name,
          price: menuItems.price,
          categoryId: menuItems.categoryId,
          available: menuItems.available,
          stock: menuItems.stock,
          description: menuItems.description,
          addOns: menuItems.addOns,
          isVegetarian: menuItems.isVegetarian,
          isTrending: menuItems.isTrending,
          createdAt: menuItems.createdAt,
        }
      })
      .from(quickOrders)
      .innerJoin(menuItems, eq(quickOrders.menuItemId, menuItems.id))
      .where(eq(quickOrders.isActive, true))
      .orderBy(quickOrders.position);
    
    return result.map(row => ({
      ...row,
      menuItem: row.menuItem
    }));
  }

  async createQuickOrder(quickOrder: InsertQuickOrder): Promise<QuickOrder> {
    const db = getDb();
    const [newQuickOrder] = await db
      .insert(quickOrders)
      .values(quickOrder)
      .returning();
    return newQuickOrder;
  }

  async updateQuickOrder(id: number, quickOrder: Partial<InsertQuickOrder>): Promise<QuickOrder> {
    const db = getDb();
    const [updatedQuickOrder] = await db
      .update(quickOrders)
      .set(quickOrder)
      .where(eq(quickOrders.id, id))
      .returning();
    return updatedQuickOrder;
  }

  async deleteQuickOrder(id: number): Promise<void> {
    const db = getDb();
    await db.delete(quickOrders).where(eq(quickOrders.id, id));
  }

  // Payments
  async getPayments(): Promise<Payment[]> {
    const db = getDb();
    return await db.select().from(payments).orderBy(desc(payments.createdAt));
  }

  async getPayment(id: number): Promise<Payment | undefined> {
    const db = getDb();
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment || undefined;
  }

  async getPaymentByMerchantTxnId(merchantTransactionId: string): Promise<Payment | undefined> {
    const db = getDb();
    const [payment] = await db.select().from(payments).where(eq(payments.merchantTransactionId, merchantTransactionId));
    return payment || undefined;
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const db = getDb();
    const [newPayment] = await db
      .insert(payments)
      .values(payment)
      .returning();
    return newPayment;
  }

  async updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment> {
    const db = getDb();
    const [updatedPayment] = await db
      .update(payments)
      .set({...payment, updatedAt: new Date()})
      .where(eq(payments.id, id))
      .returning();
    return updatedPayment;
  }

  async updatePaymentByMerchantTxnId(merchantTransactionId: string, payment: Partial<InsertPayment>): Promise<Payment | undefined> {
    const db = getDb();
    const [updatedPayment] = await db
      .update(payments)
      .set({...payment, updatedAt: new Date()})
      .where(eq(payments.merchantTransactionId, merchantTransactionId))
      .returning();
    return updatedPayment || undefined;
  }

  // Pending Orders implementation
  async getPendingOrders(): Promise<PendingOrder[]> {
    const db = getDb();
    return await db.select().from(pendingOrders).orderBy(desc(pendingOrders.createdAt));
  }

  async getPendingOrder(id: number): Promise<PendingOrder | undefined> {
    const db = getDb();
    const [pendingOrder] = await db.select().from(pendingOrders).where(eq(pendingOrders.id, id));
    return pendingOrder || undefined;
  }

  async getPendingOrderByNumber(orderNumber: string): Promise<PendingOrder | undefined> {
    const db = getDb();
    const [pendingOrder] = await db.select().from(pendingOrders).where(eq(pendingOrders.orderNumber, orderNumber));
    return pendingOrder || undefined;
  }

  async getPendingOrdersByCustomer(customerId: number): Promise<PendingOrder[]> {
    const db = getDb();
    return await db.select().from(pendingOrders).where(eq(pendingOrders.customerId, customerId)).orderBy(desc(pendingOrders.createdAt));
  }

  async getPendingOrderByMerchantTxnId(merchantTransactionId: string): Promise<PendingOrder | undefined> {
    const db = getDb();
    const [pendingOrder] = await db.select().from(pendingOrders).where(eq(pendingOrders.merchantTransactionId, merchantTransactionId));
    return pendingOrder || undefined;
  }

  async createPendingOrder(pendingOrder: InsertPendingOrder): Promise<PendingOrder> {
    const db = getDb();
    const [newPendingOrder] = await db
      .insert(pendingOrders)
      .values(pendingOrder)
      .returning();
    return newPendingOrder;
  }

  async updatePendingOrder(id: number, pendingOrder: Partial<PendingOrder>): Promise<PendingOrder> {
    const db = getDb();
    const [updatedPendingOrder] = await db
      .update(pendingOrders)
      .set({...pendingOrder, updatedAt: new Date()})
      .where(eq(pendingOrders.id, id))
      .returning();
    return updatedPendingOrder;
  }

  async deletePendingOrder(id: number): Promise<void> {
    const db = getDb();
    await db.delete(pendingOrders).where(eq(pendingOrders.id, id));
  }

  async getTimedOutPendingOrders(): Promise<PendingOrder[]> {
    const db = getDb();
    const now = new Date();
    return await db.select().from(pendingOrders).where(
      lt(pendingOrders.paymentTimeoutAt, now)
    );
  }

}

export const storage = new DatabaseStorage();
