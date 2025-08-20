import mongoose, { Schema, Document } from 'mongoose';

// Category Model
export interface ICategory extends Document {
  name: string;
  createdAt: Date;
}

const CategorySchema = new Schema<ICategory>({
  name: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});

export const Category = mongoose.model<ICategory>('Category', CategorySchema);

// MenuItem Model
export interface IMenuItem extends Document {
  name: string;
  price: number;
  categoryId?: mongoose.Types.ObjectId;
  available: boolean;
  stock: number;
  description?: string;
  addOns: string; // JSON array of add-ons
  isVegetarian: boolean;
  isMarkable: boolean; // true = requires manual ready marking, false = auto-ready
  isTrending: boolean;
  createdAt: Date;
}

const MenuItemSchema = new Schema<IMenuItem>({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
  available: { type: Boolean, default: true },
  stock: { type: Number, default: 0 },
  description: { type: String },
  addOns: { type: String, default: '[]' },
  isVegetarian: { type: Boolean, default: true },
  isMarkable: { type: Boolean, default: true },
  isTrending: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export const MenuItem = mongoose.model<IMenuItem>('MenuItem', MenuItemSchema);

// Order Model
export interface IOrder extends Document {
  orderNumber: string;
  customerId?: number; // PostgreSQL user ID
  customerName: string;
  items: string; // JSON string
  amount: number;
  status: string;
  estimatedTime: number;
  barcode: string;
  barcodeUsed: boolean;
  deliveredAt?: Date;
  seenBy?: number[]; // Array of user IDs who have seen this order
  createdAt: Date;
}

const OrderSchema = new Schema<IOrder>({
  orderNumber: { type: String, required: true, unique: true },
  customerId: { type: Number }, // References PostgreSQL user
  customerName: { type: String, required: true },
  items: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, default: 'preparing' },
  estimatedTime: { type: Number, default: 15 },
  barcode: { type: String, required: true, unique: true },
  barcodeUsed: { type: Boolean, default: false },
  deliveredAt: { type: Date },
  seenBy: { type: [Number], default: [] }, // Array of user IDs who have seen this order
  createdAt: { type: Date, default: Date.now }
});

export const Order = mongoose.model<IOrder>('Order', OrderSchema);

// OrderItem Model (for detailed order tracking)
export interface IOrderItem extends Document {
  orderId: mongoose.Types.ObjectId;
  menuItemId: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
}

const OrderItemSchema = new Schema<IOrderItem>({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true }
});

export const OrderItem = mongoose.model<IOrderItem>('OrderItem', OrderItemSchema);

// Notification Model
export interface INotification extends Document {
  type: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  type: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

// LoginIssue Model
export interface ILoginIssue extends Document {
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
}

const LoginIssueSchema = new Schema<ILoginIssue>({
  name: { type: String, required: true },
  email: { type: String },
  phoneNumber: { type: String },
  registerNumber: { type: String },
  staffId: { type: String },
  issueType: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, default: 'pending' },
  adminNotes: { type: String },
  resolvedBy: { type: String },
  resolvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

export const LoginIssue = mongoose.model<ILoginIssue>('LoginIssue', LoginIssueSchema);

// Complaint Model
export interface IComplaint extends Document {
  subject: string;
  description: string;
  userId?: number; // PostgreSQL user ID
  userName: string;
  userEmail?: string;
  category: string; // 'Payment', 'Service', 'Quality', 'Technical', 'General'
  priority: string; // 'Low', 'Medium', 'High', 'Critical'
  status: string; // 'Open', 'In Progress', 'Resolved', 'Closed'
  orderId?: mongoose.Types.ObjectId; // Related order if applicable
  adminNotes?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ComplaintSchema = new Schema<IComplaint>({
  subject: { type: String, required: true },
  description: { type: String, required: true },
  userId: { type: Number }, // References PostgreSQL user
  userName: { type: String, required: true },
  userEmail: { type: String },
  category: { 
    type: String, 
    required: true,
    enum: ['Payment', 'Service', 'Quality', 'Technical', 'General'],
    default: 'General'
  },
  priority: { 
    type: String, 
    required: true,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  status: { 
    type: String, 
    required: true,
    enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
    default: 'Open'
  },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  adminNotes: { type: String },
  resolvedBy: { type: String },
  resolvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field on save
ComplaintSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Complaint = mongoose.model<IComplaint>('Complaint', ComplaintSchema);

// QuickOrder Model
export interface IQuickOrder extends Document {
  menuItemId: mongoose.Types.ObjectId;
  position: number;
  isActive: boolean;
  createdAt: Date;
}

const QuickOrderSchema = new Schema<IQuickOrder>({
  menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  position: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

export const QuickOrder = mongoose.model<IQuickOrder>('QuickOrder', QuickOrderSchema);

// Payment Model
export interface IPayment extends Document {
  orderId?: mongoose.Types.ObjectId;
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
}

const PaymentSchema = new Schema<IPayment>({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  merchantTransactionId: { type: String, required: true, unique: true },
  phonePeTransactionId: { type: String },
  amount: { type: Number, required: true },
  status: { type: String, default: 'pending' },
  paymentMethod: { type: String },
  responseCode: { type: String },
  responseMessage: { type: String },
  checksum: { type: String },
  metadata: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);

// MediaBanner Model
export interface IMediaBanner extends Document {
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  type: 'image' | 'video';
  fileId: mongoose.Types.ObjectId; // GridFS file ID
  isActive: boolean;
  displayOrder: number;
  uploadedBy?: number; // User ID who uploaded
  createdAt: Date;
  updatedAt: Date;
}

const MediaBannerSchema = new Schema<IMediaBanner>({
  fileName: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  type: { 
    type: String, 
    required: true, 
    enum: ['image', 'video'] 
  },
  fileId: { type: Schema.Types.ObjectId, required: true }, // GridFS file reference
  isActive: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
  uploadedBy: { type: Number }, // References PostgreSQL user ID
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field on save
MediaBannerSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const MediaBanner = mongoose.model<IMediaBanner>('MediaBanner', MediaBannerSchema);

// Discount Coupon Model
export interface ICoupon extends Document {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit: number;
  usedCount: number;
  usedBy: number[]; // Array of user IDs who have used this coupon
  isActive: boolean;
  validFrom: Date;
  validUntil: Date;
  createdBy: number; // Admin user ID
  createdAt: Date;
}

const CouponSchema = new Schema<ICoupon>({
  code: { type: String, required: true, unique: true, uppercase: true },
  description: { type: String, required: true },
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true },
  minimumOrderAmount: { type: Number, default: 0 },
  maxDiscountAmount: { type: Number },
  usageLimit: { type: Number, required: true },
  usedCount: { type: Number, default: 0 },
  usedBy: { type: [Number], default: [] },
  isActive: { type: Boolean, default: true },
  validFrom: { type: Date, required: true },
  validUntil: { type: Date, required: true },
  createdBy: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const Coupon = mongoose.model<ICoupon>('Coupon', CouponSchema);