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