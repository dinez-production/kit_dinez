import webPush from 'web-push';
import crypto from 'crypto';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
  url?: string;
  // Android-specific properties for heads-up notifications
  priority?: 'min' | 'low' | 'normal' | 'high' | 'max';
  urgency?: 'very-low' | 'low' | 'normal' | 'high';
  vibrate?: number[];
  renotify?: boolean;
  sticky?: boolean;
}

interface StoredSubscription {
  subscription: PushSubscription;
  userId: string;
  userRole: string;
  deviceInfo?: string;
  subscribedAt: number;
}

interface OrderStatusTemplate {
  id: string;
  status: string;
  title: string;
  message: string;
  icon: string;
  priority: 'normal' | 'high';
  requireInteraction: boolean;
  enabled: boolean;
}

export class WebPushService {
  private subscriptions = new Map<string, StoredSubscription>();
  private vapidKeys: { publicKey: string; privateKey: string } | null = null;
  private notificationTemplates = new Map<string, OrderStatusTemplate>();

  constructor() {
    this.initializeVAPID();
    this.initializeDefaultTemplates();
  }

  private initializeVAPID() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const emailContact = process.env.VAPID_EMAIL || 'dinez.production@gmail.com';

    if (!publicKey || !privateKey) {
      console.warn('VAPID keys not found. Generating new keys...');
      this.generateVAPIDKeys();
      return;
    }

    try {
      this.vapidKeys = { publicKey, privateKey };
      
      webPush.setVapidDetails(
        `mailto:${emailContact}`,
        publicKey,
        privateKey
      );
      
      console.log('✅ Web Push service initialized with VAPID keys');
    } catch (error) {
      console.error('❌ Failed to initialize VAPID keys:', error);
      this.generateVAPIDKeys();
    }
  }

  private generateVAPIDKeys() {
    try {
      const vapidKeys = webPush.generateVAPIDKeys();
      this.vapidKeys = vapidKeys;

      console.log('\n🔑 Generated new VAPID keys:');
      console.log('Add these to your .env file:');
      console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
      console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
      console.log('VAPID_EMAIL=dinez.production@gmail.com');
      console.log('');

      // Set temporary VAPID details for this session
      webPush.setVapidDetails(
        'mailto:dinez.production@gmail.com',
        vapidKeys.publicKey,
        vapidKeys.privateKey
      );

      console.log('⚠️  Temporary VAPID keys set for this session. Add the keys to .env for persistence.');
    } catch (error) {
      console.error('❌ Failed to generate VAPID keys:', error);
    }
  }

  getVAPIDPublicKey(): string | null {
    return this.vapidKeys?.publicKey || null;
  }

  isConfigured(): boolean {
    return !!this.vapidKeys?.publicKey && !!this.vapidKeys?.privateKey;
  }

  private initializeDefaultTemplates() {
    const defaultTemplates: OrderStatusTemplate[] = [
      {
        id: 'confirmed',
        status: 'confirmed',
        title: 'Order Confirmed!',
        message: 'Your order #{orderNumber} has been confirmed and is being prepared.',
        icon: '✅',
        priority: 'normal',
        requireInteraction: false,
        enabled: true
      },
      {
        id: 'preparing',
        status: 'preparing',
        title: 'Being Prepared',
        message: 'Your order #{orderNumber} is now being prepared in the kitchen.',
        icon: '👨‍🍳',
        priority: 'normal',
        requireInteraction: false,
        enabled: true
      },
      {
        id: 'ready',
        status: 'ready',
        title: 'Ready for Pickup!',
        message: 'Your order #{orderNumber} is ready for collection at the counter.',
        icon: '🔔',
        priority: 'high',
        requireInteraction: true,
        enabled: true
      },
      {
        id: 'completed',
        status: 'completed',
        title: 'Order Completed',
        message: 'Your order #{orderNumber} has been completed. Thank you for your order!',
        icon: '🎉',
        priority: 'normal',
        requireInteraction: false,
        enabled: true
      },
      {
        id: 'cancelled',
        status: 'cancelled',
        title: 'Order Cancelled',
        message: 'Your order #{orderNumber} has been cancelled. Contact support for details.',
        icon: '❌',
        priority: 'high',
        requireInteraction: true,
        enabled: true
      }
    ];

    defaultTemplates.forEach(template => {
      this.notificationTemplates.set(template.status, template);
    });
    
    console.log('✅ Notification templates initialized');
  }

  /**
   * Subscribe a user to push notifications
   */
  addSubscription(
    subscription: PushSubscription, 
    userId: string, 
    userRole: string = 'student',
    deviceInfo?: string
  ): string {
    const subscriptionId = this.generateSubscriptionId(subscription);
    
    this.subscriptions.set(subscriptionId, {
      subscription,
      userId,
      userRole,
      deviceInfo,
      subscribedAt: Date.now(),
    });

    console.log(`📱 User ${userId} subscribed to push notifications (${subscriptionId.slice(0, 8)}...)`);
    return subscriptionId;
  }

  /**
   * Remove a subscription
   */
  removeSubscription(subscriptionId: string): boolean {
    const removed = this.subscriptions.delete(subscriptionId);
    if (removed) {
      console.log(`📱 Subscription removed: ${subscriptionId.slice(0, 8)}...`);
    }
    return removed;
  }

  /**
   * Generate a unique subscription ID from the endpoint
   */
  private generateSubscriptionId(subscription: PushSubscription): string {
    return crypto
      .createHash('sha256')
      .update(subscription.endpoint)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Send notification to a specific user
   */
  async sendToUser(userId: string, payload: NotificationPayload): Promise<void> {
    if (!this.isConfigured()) {
      console.warn('Web Push not configured, skipping notification');
      return;
    }

    const userSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.userId === userId);

    if (userSubscriptions.length === 0) {
      console.warn(`No subscriptions found for user: ${userId}`);
      return;
    }

    const notifications = userSubscriptions.map(({ subscription }) =>
      this.sendNotification(subscription, payload)
    );

    try {
      await Promise.allSettled(notifications);
      console.log(`✅ Sent notification to user ${userId} (${userSubscriptions.length} devices)`);
    } catch (error) {
      console.error(`❌ Failed to send notification to user ${userId}:`, error);
    }
  }

  /**
   * Send notification to all users with a specific role
   */
  async sendToRole(role: string, payload: NotificationPayload): Promise<void> {
    if (!this.isConfigured()) {
      console.warn('Web Push not configured, skipping notification');
      return;
    }

    const roleSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.userRole === role);

    if (roleSubscriptions.length === 0) {
      console.warn(`No subscriptions found for role: ${role}`);
      return;
    }

    const notifications = roleSubscriptions.map(({ subscription }) =>
      this.sendNotification(subscription, payload)
    );

    try {
      await Promise.allSettled(notifications);
      console.log(`✅ Sent notification to role ${role} (${roleSubscriptions.length} devices)`);
    } catch (error) {
      console.error(`❌ Failed to send notification to role ${role}:`, error);
    }
  }

  /**
   * Send notification to all subscribed users
   */
  async sendToAll(payload: NotificationPayload): Promise<void> {
    if (!this.isConfigured()) {
      console.warn('Web Push not configured, skipping notification');
      return;
    }

    if (this.subscriptions.size === 0) {
      console.warn('No active subscriptions found');
      return;
    }

    const notifications = Array.from(this.subscriptions.values()).map(({ subscription }) =>
      this.sendNotification(subscription, payload)
    );

    try {
      await Promise.allSettled(notifications);
      console.log(`✅ Sent broadcast notification (${this.subscriptions.size} devices)`);
    } catch (error) {
      console.error('❌ Failed to send broadcast notification:', error);
    }
  }

  /**
   * Send notification to a specific subscription
   */
  private async sendNotification(
    subscription: PushSubscription,
    payload: NotificationPayload
  ): Promise<void> {
    try {
      // Force Android heads-up notification settings
      const androidOptimizedPayload = {
        ...payload,
        timestamp: payload.timestamp || Date.now(),
        // Maximum priority for Android heads-up notifications
        requireInteraction: true,
        renotify: true,
        sticky: true,
        vibrate: payload.vibrate || [300, 200, 300, 200, 300],
        priority: 'high',
        urgency: 'high',
      };

      const notificationPayload = JSON.stringify(androidOptimizedPayload);

      console.log('📤 Sending Android-optimized push notification:', {
        endpoint: subscription.endpoint.substring(0, 50) + '...',
        payload: payload.title,
        androidOptimized: true
      });

      // Send with high priority headers for Android
      const options = {
        headers: {
          'Urgency': 'high',
          'Priority': 'high'
        }
      };

      await webPush.sendNotification(subscription, notificationPayload, options);
      console.log('✅ Android-optimized push notification sent successfully');
    } catch (error: any) {
      console.error('❌ Push notification failed:', {
        message: error?.message || error,
        statusCode: error?.statusCode,
        endpoint: subscription.endpoint.substring(0, 50) + '...'
      });
      
      // Remove invalid subscriptions (410 = Gone)
      if (error?.statusCode === 410) {
        const subscriptionId = this.generateSubscriptionId(subscription);
        console.log(`🗑️ Removing invalid subscription: ${subscriptionId}`);
        this.removeSubscription(subscriptionId);
      }
      throw error;
    }
  }

  /**
   * Send order update notification using customizable templates
   */
  async sendOrderUpdate(
    userId: string,
    orderNumber: string,
    status: string,
    message?: string
  ): Promise<void> {
    const template = this.notificationTemplates.get(status);
    
    if (!template || !template.enabled) {
      console.warn(`No enabled template found for status: ${status}`);
      return;
    }

    // Replace placeholders in the template message
    const templateMessage = template.message.replace(/{orderNumber}/g, orderNumber);
    const finalMessage = message || templateMessage;

    await this.sendToUser(userId, {
      title: template.title,
      body: finalMessage,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: {
        type: 'order_update',
        orderNumber,
        status,
        notificationType: status,
        title: template.title,
        message: finalMessage,
        timestamp: Date.now(),
        icon: template.icon
      },
      url: `/orders/${orderNumber}`,
      tag: `order_${orderNumber}`,
      requireInteraction: template.requireInteraction,
      // Android-specific settings for heads-up notifications
      priority: template.priority,
      urgency: template.priority,
      vibrate: [200, 100, 200],
      renotify: true,
      sticky: template.requireInteraction,
    });
  }

  /**
   * Send payment confirmation notification
   */
  async sendPaymentConfirmation(
    userId: string,
    orderNumber: string,
    amount: number
  ): Promise<void> {
    await this.sendToUser(userId, {
      title: 'Payment Confirmed',
      body: `Payment of ₹${amount} for order #${orderNumber} has been confirmed.`,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: {
        type: 'payment_confirmation',
        orderNumber,
        amount,
      },
      url: `/orders/${orderNumber}`,
      tag: `payment_${orderNumber}`,
      // Android-specific settings for heads-up notifications
      priority: 'high',
      urgency: 'high',
      vibrate: [200, 100, 200],
      renotify: true,
    });
  }

  /**
   * Send new order notification to canteen owners
   */
  async sendNewOrderNotification(
    orderNumber: string,
    customerName: string,
    totalAmount: number
  ): Promise<void> {
    await this.sendToRole('admin', {
      title: 'New Order Received',
      body: `New order #${orderNumber} from ${customerName} - ₹${totalAmount}`,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: {
        type: 'new_order',
        orderNumber,
        customerName,
        totalAmount,
      },
      url: `/admin/orders/${orderNumber}`,
      tag: `new_order_${orderNumber}`,
      requireInteraction: true,
      // Android-specific settings for heads-up notifications
      priority: 'high',
      urgency: 'high',
      vibrate: [300, 150, 300],
      renotify: true,
      sticky: true,
    });
  }

  /**
   * Get subscription statistics
   */
  getStats() {
    const totalSubscriptions = this.subscriptions.size;
    const roleStats = Array.from(this.subscriptions.values()).reduce((acc, sub) => {
      acc[sub.userRole] = (acc[sub.userRole] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const userStats = Array.from(this.subscriptions.values()).reduce((acc, sub) => {
      acc[sub.userId] = (acc[sub.userId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSubscriptions,
      roleStats,
      uniqueUsers: Object.keys(userStats).length,
      isConfigured: this.isConfigured(),
      vapidPublicKey: this.getVAPIDPublicKey(),
      lastUpdated: Date.now(),
    };
  }

  /**
   * Template management methods
   */
  getNotificationTemplates(): OrderStatusTemplate[] {
    return Array.from(this.notificationTemplates.values());
  }

  getNotificationTemplate(status: string): OrderStatusTemplate | undefined {
    return this.notificationTemplates.get(status);
  }

  updateNotificationTemplate(template: OrderStatusTemplate): boolean {
    if (this.notificationTemplates.has(template.status)) {
      this.notificationTemplates.set(template.status, template);
      console.log(`📝 Updated notification template for status: ${template.status}`);
      return true;
    }
    return false;
  }

  addNotificationTemplate(template: OrderStatusTemplate): boolean {
    if (!this.notificationTemplates.has(template.status)) {
      this.notificationTemplates.set(template.status, template);
      console.log(`➕ Added notification template for status: ${template.status}`);
      return true;
    }
    return false;
  }

  deleteNotificationTemplate(status: string): boolean {
    const deleted = this.notificationTemplates.delete(status);
    if (deleted) {
      console.log(`🗑️ Deleted notification template for status: ${status}`);
    }
    return deleted;
  }
}

// Export singleton instance
export const webPushService = new WebPushService();