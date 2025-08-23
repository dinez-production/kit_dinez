import express from 'express';
import { storage } from '../storage-hybrid';
import { insertSystemSettingsSchema, type SystemSettings, type InsertSystemSettings } from '@shared/schema';
import mongoose from 'mongoose';

const router = express.Router();

// MongoDB model for SystemSettings
const SystemSettingsSchema = new mongoose.Schema({
  maintenanceMode: {
    isActive: { type: Boolean, default: false },
    title: { type: String, default: 'System Maintenance' },
    message: { type: String, default: 'We are currently performing system maintenance. Please check back later.' },
    estimatedTime: { type: String, default: '' },
    contactInfo: { type: String, default: '' },
    lastUpdatedBy: { type: Number },
    lastUpdatedAt: { type: Date }
  },
  notifications: {
    isEnabled: { type: Boolean, default: true },
    lastUpdatedBy: { type: Number },
    lastUpdatedAt: { type: Date }
  },
  appVersion: {
    version: { type: String, default: '1.0.0' },
    buildTimestamp: { type: Number, default: Date.now },
    lastUpdatedBy: { type: Number },
    lastUpdatedAt: { type: Date }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const SystemSettingsModel = mongoose.model('SystemSettings', SystemSettingsSchema);

/**
 * Get current system settings
 */
router.get('/', async (req, res) => {
  try {
    let settings = await SystemSettingsModel.findOne().sort({ createdAt: -1 });
    
    // If no settings exist, create default settings
    if (!settings) {
      const defaultSettings: InsertSystemSettings = {
        maintenanceMode: {
          isActive: false,
          title: 'System Maintenance',
          message: 'We are currently performing system maintenance. Please check back later.',
          estimatedTime: '',
          contactInfo: ''
        },
        notifications: {
          isEnabled: true
        },
        appVersion: {
          version: '1.0.0',
          buildTimestamp: Date.now()
        }
      };
      
      settings = new SystemSettingsModel(defaultSettings);
      await settings.save();
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({ error: 'Failed to fetch system settings' });
  }
});

/**
 * Update system settings (admin only)
 */
router.put('/', async (req, res) => {
  try {
    // Validate request body
    const validatedData = insertSystemSettingsSchema.parse(req.body);
    
    // Add update metadata
    const updateData = {
      ...validatedData,
      updatedAt: new Date()
    };

    // Update maintenance mode metadata if changed
    if (validatedData.maintenanceMode) {
      updateData.maintenanceMode.lastUpdatedAt = new Date();
      if (req.body.updatedBy) {
        updateData.maintenanceMode.lastUpdatedBy = req.body.updatedBy;
      }
    }

    // Update notifications metadata if changed
    if (validatedData.notifications) {
      updateData.notifications.lastUpdatedAt = new Date();
      if (req.body.updatedBy) {
        updateData.notifications.lastUpdatedBy = req.body.updatedBy;
      }
    }

    // Update app version metadata if changed
    if (validatedData.appVersion) {
      updateData.appVersion.lastUpdatedAt = new Date();
      if (req.body.updatedBy) {
        updateData.appVersion.lastUpdatedBy = req.body.updatedBy;
      }
    }
    
    let settings = await SystemSettingsModel.findOne().sort({ createdAt: -1 });
    
    if (settings) {
      // Update existing settings
      Object.assign(settings, updateData);
      await settings.save();
    } else {
      // Create new settings if none exist
      settings = new SystemSettingsModel(updateData);
      await settings.save();
    }
    
    console.log('📝 System settings updated:', {
      maintenanceMode: settings.maintenanceMode?.isActive,
      notifications: settings.notifications?.isEnabled,
      updatedBy: req.body.updatedBy || 'unknown'
    });
    
    res.json(settings);
  } catch (error) {
    console.error('Error updating system settings:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid request data', details: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update system settings' });
    }
  }
});

/**
 * Get maintenance status only (public endpoint)
 */
router.get('/maintenance-status', async (req, res) => {
  try {
    const settings = await SystemSettingsModel.findOne().sort({ createdAt: -1 });
    
    if (!settings) {
      // Return default maintenance status if no settings exist
      return res.json({
        isActive: false,
        title: 'System Maintenance',
        message: 'We are currently performing system maintenance. Please check back later.'
      });
    }
    
    res.json({
      isActive: settings.maintenanceMode?.isActive || false,
      title: settings.maintenanceMode?.title || 'System Maintenance',
      message: settings.maintenanceMode?.message || 'We are currently performing system maintenance. Please check back later.',
      estimatedTime: settings.maintenanceMode?.estimatedTime || '',
      contactInfo: settings.maintenanceMode?.contactInfo || ''
    });
  } catch (error) {
    console.error('Error fetching maintenance status:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance status' });
  }
});

/**
 * Get app version info (public endpoint)
 */
router.get('/app-version', async (req, res) => {
  try {
    const settings = await SystemSettingsModel.findOne().sort({ createdAt: -1 });
    
    if (!settings) {
      // Return default version info if no settings exist
      return res.json({
        version: '1.0.0',
        buildTimestamp: Date.now()
      });
    }
    
    res.json({
      version: settings.appVersion?.version || '1.0.0',
      buildTimestamp: settings.appVersion?.buildTimestamp || Date.now()
    });
  } catch (error) {
    console.error('Error fetching app version:', error);
    res.status(500).json({ error: 'Failed to fetch app version' });
  }
});

/**
 * Get notification settings (public endpoint)
 */
router.get('/notification-status', async (req, res) => {
  try {
    const settings = await SystemSettingsModel.findOne().sort({ createdAt: -1 });
    
    if (!settings) {
      // Return default notification status if no settings exist
      return res.json({
        isEnabled: true
      });
    }
    
    res.json({
      isEnabled: settings.notifications?.isEnabled || true
    });
  } catch (error) {
    console.error('Error fetching notification status:', error);
    res.status(500).json({ error: 'Failed to fetch notification status' });
  }
});

/**
 * Update maintenance mode only (admin shortcut)
 */
router.patch('/maintenance', async (req, res) => {
  try {
    const { isActive, title, message, estimatedTime, contactInfo, updatedBy } = req.body;
    
    let settings = await SystemSettingsModel.findOne().sort({ createdAt: -1 });
    
    if (!settings) {
      // Create default settings if none exist
      const defaultSettings: InsertSystemSettings = {
        maintenanceMode: {
          isActive: false,
          title: 'System Maintenance',
          message: 'We are currently performing system maintenance. Please check back later.',
          estimatedTime: '',
          contactInfo: ''
        },
        notifications: {
          isEnabled: true
        },
        appVersion: {
          version: '1.0.0',
          buildTimestamp: Date.now()
        }
      };
      
      settings = new SystemSettingsModel(defaultSettings);
    }
    
    // Update maintenance mode settings
    if (!settings.maintenanceMode) {
      settings.maintenanceMode = {
        isActive: false,
        title: 'System Maintenance',
        message: 'We are currently performing system maintenance. Please check back later.',
        estimatedTime: '',
        contactInfo: ''
      };
    }
    
    if (typeof isActive === 'boolean') {
      settings.maintenanceMode.isActive = isActive;
    }
    if (title) {
      settings.maintenanceMode.title = title;
    }
    if (message) {
      settings.maintenanceMode.message = message;
    }
    if (estimatedTime !== undefined) {
      settings.maintenanceMode.estimatedTime = estimatedTime;
    }
    if (contactInfo !== undefined) {
      settings.maintenanceMode.contactInfo = contactInfo;
    }
    
    settings.maintenanceMode.lastUpdatedAt = new Date();
    if (updatedBy) {
      settings.maintenanceMode.lastUpdatedBy = updatedBy;
    }
    settings.updatedAt = new Date();
    
    await settings.save();
    
    console.log(`🔧 Maintenance mode ${isActive ? 'ENABLED' : 'DISABLED'} by user ${updatedBy || 'unknown'}`);
    
    res.json({
      success: true,
      maintenanceMode: settings.maintenanceMode
    });
  } catch (error) {
    console.error('Error updating maintenance mode:', error);
    res.status(500).json({ error: 'Failed to update maintenance mode' });
  }
});

export default router;