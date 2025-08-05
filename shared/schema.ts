import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  phoneNumber: text("phone_number"),
  role: text("role").notNull(), // "student" or "staff"
  
  // For students
  registerNumber: text("register_number").unique(),
  department: text("department"),
  joiningYear: integer("joining_year"),
  passingOutYear: integer("passing_out_year"),
  currentStudyYear: integer("current_study_year"),
  isPassed: boolean("is_passed").default(false),
  
  // For staff
  staffId: text("staff_id").unique(),
  
  // Profile completion status
  isProfileComplete: boolean("is_profile_complete").default(false),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  available: boolean("available").notNull().default(true),
  stock: integer("stock").notNull().default(0),
  description: text("description"),
  addOns: text("add_ons").default('[]'), // JSON array of add-ons
  isVegetarian: boolean("is_vegetarian").notNull().default(true), // true for veg, false for non-veg
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerId: integer("customer_id").references(() => users.id),
  customerName: text("customer_name").notNull(),
  items: text("items").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("preparing"),
  estimatedTime: integer("estimated_time").notNull().default(15),
  barcode: text("barcode").notNull(), // unique barcode for delivery verification
  barcodeUsed: boolean("barcode_used").default(false).notNull(), // prevents barcode reuse
  deliveredAt: timestamp("delivered_at"), // timestamp when order was delivered
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id),
  menuItemId: integer("menu_item_id").references(() => menuItems.id),
  quantity: integer("quantity").notNull(),
  price: integer("price").notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const loginIssues = pgTable("login_issues", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phoneNumber: text("phone_number"),
  registerNumber: text("register_number"),
  staffId: text("staff_id"),
  issueType: text("issue_type").notNull(), // "forgot_password", "account_locked", "email_changed", "other"
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"), // "pending", "in_progress", "resolved"
  adminNotes: text("admin_notes"),
  resolvedBy: text("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const categoriesRelations = relations(categories, ({ many }) => ({
  menuItems: many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  category: one(categories, {
    fields: [menuItems.categoryId],
    references: [categories.id],
  }),
  orderItems: many(orderItems),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(users, {
    fields: [orders.customerId],
    references: [users.id],
  }),
  orderItems: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  menuItem: one(menuItems, {
    fields: [orderItems.menuItemId],
    references: [menuItems.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  name: true,
  phoneNumber: true,
  role: true,
  registerNumber: true,
  department: true,
  joiningYear: true,
  passingOutYear: true,
  currentStudyYear: true,
  isPassed: true,
  staffId: true,
  isProfileComplete: true,
});

// Profile completion schema for new users
export const profileCompletionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  role: z.enum(["student", "staff"], { required_error: "Role is required" }),
  
  // Student fields (conditional)
  registerNumber: z.string().optional(),
  department: z.string().optional(),
  passingOutYear: z.number().optional(),
  
  // Staff fields (conditional)
  staffId: z.string().optional(),
}).refine((data) => {
  if (data.role === "student") {
    return data.registerNumber && data.department && data.passingOutYear;
  }
  if (data.role === "staff") {
    return data.staffId;
  }
  return false;
}, {
  message: "Please fill all required fields for your role",
});

// Validation for register number format
export const registerNumberSchema = z.string().regex(
  /^7115\d{2}[A-Za-z]{3}\d{3}$/,
  "Register number must be in format: 7115XXABC123 (7115 + year + department + roll number)"
);

// Validation for staff ID format
export const staffIdSchema = z.string().regex(
  /^\d{6}$/,
  "Staff ID must be 6 digits (e.g., 000001)"
);

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
});

export const insertMenuItemSchema = createInsertSchema(menuItems).pick({
  name: true,
  price: true,
  categoryId: true,
  available: true,
  stock: true,
  description: true,
  addOns: true,
  isVegetarian: true,
});

export const insertOrderSchema = createInsertSchema(orders).pick({
  orderNumber: true,
  customerId: true,
  customerName: true,
  items: true,
  amount: true,
  status: true,
  estimatedTime: true,
  barcode: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  type: true,
  message: true,
  read: true,
});

export const insertLoginIssueSchema = createInsertSchema(loginIssues).pick({
  name: true,
  email: true,
  phoneNumber: true,
  registerNumber: true,
  staffId: true,
  issueType: true,
  description: true,
  status: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItems.$inferSelect;

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type InsertLoginIssue = z.infer<typeof insertLoginIssueSchema>;
export type LoginIssue = typeof loginIssues.$inferSelect;
