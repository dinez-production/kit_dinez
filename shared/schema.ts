// Re-export Prisma types for compatibility
export type { 
  User, Category, MenuItem, Order, OrderItem, Notification, LoginIssue, QuickOrder, Payment,
  Prisma
} from '@prisma/client';

// Re-export insert types from Prisma
export type InsertUser = Prisma.UserCreateInput;
export type InsertCategory = Prisma.CategoryCreateInput;
export type InsertMenuItem = Prisma.MenuItemCreateInput;
export type InsertOrder = Prisma.OrderCreateInput;
export type InsertOrderItem = Prisma.OrderItemCreateInput;
export type InsertNotification = Prisma.NotificationCreateInput;
export type InsertLoginIssue = Prisma.LoginIssueCreateInput;
export type InsertQuickOrder = Prisma.QuickOrderCreateInput;
export type InsertPayment = Prisma.PaymentCreateInput;

// Keep validation schemas using Zod for form validation
import { z } from "zod";

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

// Form validation schemas for API endpoints
export const insertUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  phoneNumber: z.string().optional(),
  role: z.string(),
  registerNumber: z.string().optional(),
  department: z.string().optional(),
  joiningYear: z.number().optional(),
  passingOutYear: z.number().optional(),
  currentStudyYear: z.number().optional(),
  isPassed: z.boolean().optional(),
  staffId: z.string().optional(),
  isProfileComplete: z.boolean().optional(),
});

export const insertCategorySchema = z.object({
  name: z.string().min(1),
});

export const insertMenuItemSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  categoryId: z.number().optional(),
  available: z.boolean().optional(),
  stock: z.number().min(0).optional(),
  description: z.string().optional(),
  addOns: z.string().optional(),
  isVegetarian: z.boolean().optional(),
  isTrending: z.boolean().optional(),
});

export const insertOrderSchema = z.object({
  orderNumber: z.string(),
  customerId: z.number().optional(),
  customerName: z.string().min(1),
  items: z.string(),
  amount: z.number().positive(),
  status: z.string().optional(),
  estimatedTime: z.number().optional(),
  barcode: z.string(),
});

export const insertNotificationSchema = z.object({
  type: z.string(),
  message: z.string(),
  read: z.boolean().optional(),
});

export const insertLoginIssueSchema = z.object({
  name: z.string().min(1),
  email: z.string().optional(),
  phoneNumber: z.string().optional(),
  registerNumber: z.string().optional(),
  staffId: z.string().optional(),
  issueType: z.string(),
  description: z.string().min(1),
  status: z.string().optional(),
});

export const insertQuickOrderSchema = z.object({
  menuItemId: z.number(),
  position: z.number().min(1).max(4),
  isActive: z.boolean().optional(),
});

export const insertPaymentSchema = z.object({
  orderId: z.number().optional(),
  merchantTransactionId: z.string(),
  phonePeTransactionId: z.string().optional(),
  amount: z.number().positive(),
  status: z.string().optional(),
  paymentMethod: z.string().optional(),
  responseCode: z.string().optional(),
  responseMessage: z.string().optional(),
  checksum: z.string().optional(),
  metadata: z.string().optional(),
});

// Import Prisma namespace for type inference
import type { Prisma } from '@prisma/client';