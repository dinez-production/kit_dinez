// Re-export Prisma types for User (PostgreSQL)
export type { 
  User,
  Prisma
} from '@prisma/client';

// Re-export insert types from Prisma
export type InsertUser = Prisma.UserCreateInput;

// MongoDB types (defined in mongodb-models.ts)
export type Category = {
  id: string;
  name: string;
  createdAt: Date;
};

export type MenuItem = {
  id: string;
  name: string;
  price: number;
  categoryId?: string;
  available: boolean;
  stock: number;
  description?: string;
  addOns: string;
  isVegetarian: boolean;
  isMarkable: boolean; // true = requires manual ready marking, false = auto-ready
  isTrending: boolean;
  createdAt: Date;
};

export type Order = {
  id: string;
  orderNumber: string;
  customerId?: number; // PostgreSQL user ID
  customerName: string;
  items: string;
  amount: number;
  originalAmount?: number; // Amount before discount
  discountAmount?: number; // Discount applied
  appliedCoupon?: string; // Coupon code used
  status: string;
  estimatedTime: number;
  barcode: string;
  barcodeUsed: boolean;
  deliveredAt?: Date;
  seenBy?: number[]; // Array of user IDs who have seen this order
  createdAt: Date;
};

export type OrderItem = {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  price: number;
};

export type Notification = {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: Date;
};

export type LoginIssue = {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  registerNumber?: string;
  staffId?: string;
  issueType: string;
  description: string;
  status: string;
  adminNotes?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
};

export type Complaint = {
  id: string;
  subject: string;
  description: string;
  userId?: number; // PostgreSQL user ID
  userName: string;
  userEmail?: string;
  category: string; // 'Payment', 'Service', 'Quality', 'Technical', 'General'
  priority: string; // 'Low', 'Medium', 'High', 'Critical'
  status: string; // 'Open', 'In Progress', 'Resolved', 'Closed'
  orderId?: string; // Related order if applicable
  adminNotes?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type QuickOrder = {
  id: string;
  menuItemId: string;
  position: number;
  isActive: boolean;
  createdAt: Date;
};

export type Payment = {
  id: string;
  orderId?: string;
  merchantTransactionId: string;
  phonePeTransactionId?: string;
  amount: number;
  status: string;
  paymentMethod?: string;
  responseCode?: string;
  responseMessage?: string;
  checksum?: string;
  metadata?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type MediaBanner = {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  type: 'image' | 'video';
  fileId: string; // GridFS file ID
  isActive: boolean;
  displayOrder: number;
  uploadedBy?: number; // User ID who uploaded
  createdAt: Date;
  updatedAt: Date;
};


export type CouponUsageHistory = {
  userId: number;
  orderId: string;
  orderNumber: string;
  discountAmount: number;
  usedAt: Date;
};

export type Coupon = {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit: number;
  usedCount: number;
  usedBy: number[];
  assignmentType: 'all' | 'specific'; // Whether coupon is for all users or specific users
  assignedUsers: number[]; // Array of user IDs the coupon is assigned to (only for specific assignment)
  usageHistory: CouponUsageHistory[]; // Detailed usage history
  isActive: boolean;
  validFrom: Date;
  validUntil: Date;
  createdBy: number;
  createdAt: Date;
};

export type SystemSettings = {
  id: string;
  maintenanceMode: {
    isActive: boolean;
    title: string;
    message: string;
    estimatedTime?: string;
    contactInfo?: string;
    lastUpdatedBy?: number;
    lastUpdatedAt?: Date;
  };
  notifications: {
    isEnabled: boolean;
    lastUpdatedBy?: number;
    lastUpdatedAt?: Date;
  };
  appVersion: {
    version: string;
    buildTimestamp: number;
    lastUpdatedBy?: number;
    lastUpdatedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
};

// Insert types for MongoDB models
export type InsertCategory = Omit<Category, 'id' | 'createdAt'>;
export type InsertMenuItem = Omit<MenuItem, 'id' | 'createdAt'>;
export type InsertOrder = Omit<Order, 'id' | 'createdAt'>;
export type InsertMediaBanner = Omit<MediaBanner, 'id' | 'createdAt' | 'updatedAt'>;
export type InsertOrderItem = Omit<OrderItem, 'id'>;
export type InsertNotification = Omit<Notification, 'id' | 'createdAt'>;
export type InsertLoginIssue = Omit<LoginIssue, 'id' | 'createdAt'>;
export type InsertQuickOrder = Omit<QuickOrder, 'id' | 'createdAt'>;
export type InsertPayment = Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>;
export type InsertComplaint = Omit<Complaint, 'id' | 'createdAt' | 'updatedAt'>;
export type InsertCoupon = Omit<Coupon, 'id' | 'createdAt' | 'usedCount' | 'usedBy' | 'usageHistory'> & {
  assignmentType?: 'all' | 'specific';
  assignedUsers?: number[];
};
export type InsertSystemSettings = Omit<SystemSettings, 'id' | 'createdAt' | 'updatedAt'>;

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

// Complaint validation schemas
export const insertComplaintSchema = z.object({
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  userId: z.number().optional(),
  userName: z.string().min(1, "User name is required"),
  userEmail: z.string().email().optional(),
  category: z.enum(["Payment", "Service", "Quality", "Technical", "General"]).default("General"),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).default("Medium"),
  status: z.enum(["Open", "In Progress", "Resolved", "Closed"]).default("Open"),
  orderId: z.string().optional(),
  adminNotes: z.string().optional(),
  resolvedBy: z.string().optional(),
});

// Validation for staff ID format
export const staffIdSchema = z.string().regex(
  /^[A-Za-z_]{3}\d{3}$/,
  "Staff ID must be 3 letters followed by 3 numbers (e.g., ABC123). Use '_' for missing letters."
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
  categoryId: z.string().optional(),
  available: z.boolean().optional(),
  stock: z.number().min(0).optional(),
  description: z.string().optional(),
  addOns: z.string().optional(),
  isVegetarian: z.boolean().optional(),
  isMarkable: z.boolean().optional(),
  isTrending: z.boolean().optional(),
});

export const insertOrderSchema = z.object({
  orderNumber: z.string(),
  customerId: z.number().optional(),
  customerName: z.string().min(1),
  items: z.string(),
  amount: z.number().min(0),
  status: z.string().optional(),
  estimatedTime: z.number().optional(),
  barcode: z.string(),
  isCounterOrder: z.boolean().optional(),
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
  menuItemId: z.string(),
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

export const insertSystemSettingsSchema = z.object({
  maintenanceMode: z.object({
    isActive: z.boolean(),
    title: z.string().min(1, "Maintenance title is required"),
    message: z.string().min(1, "Maintenance message is required"),
    estimatedTime: z.string().optional(),
    contactInfo: z.string().optional(),
    lastUpdatedBy: z.number().optional(),
    lastUpdatedAt: z.date().optional(),
  }),
  notifications: z.object({
    isEnabled: z.boolean(),
    lastUpdatedBy: z.number().optional(),
    lastUpdatedAt: z.date().optional(),
  }),
  appVersion: z.object({
    version: z.string().min(1, "App version is required"),
    buildTimestamp: z.number(),
    lastUpdatedBy: z.number().optional(),
    lastUpdatedAt: z.date().optional(),
  }),
});


// Import Prisma namespace for type inference
import type { Prisma } from '@prisma/client';