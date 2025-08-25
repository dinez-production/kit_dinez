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
    // Targeting options - if all are empty/null, applies to everyone
    targetingType: { type: String, default: 'all' }, // 'all', 'specific', 'department', 'year', 'year_department'
    specificUsers: [{ type: String }], // Array of registerNumbers or staffIds
    targetDepartments: [{ type: String }], // Array of department names
    targetYears: [{ type: Number }], // Array of years (joiningYear, passingOutYear, currentStudyYear)
    yearType: { type: String, default: 'current' }, // 'joining', 'passing', 'current'
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
          contactInfo: '',
          targetingType: 'all',
          specificUsers: [],
          targetDepartments: [],
          targetYears: [],
          yearType: 'current'
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
      contactInfo: settings.maintenanceMode?.contactInfo || '',
      targetingType: settings.maintenanceMode?.targetingType || 'all',
      specificUsers: settings.maintenanceMode?.specificUsers || [],
      targetDepartments: settings.maintenanceMode?.targetDepartments || [],
      targetYears: settings.maintenanceMode?.targetYears || [],
      yearType: settings.maintenanceMode?.yearType || 'current'
    });
  } catch (error) {
    console.error('Error fetching maintenance status:', error);
    res.status(500).json({ error: 'Failed to fetch maintenance status' });
  }
});

/**
 * Check if maintenance mode applies to a specific user
 */
router.get('/maintenance-status/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (!userId) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Get the user from PostgreSQL
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get maintenance settings
    const settings = await SystemSettingsModel.findOne().sort({ createdAt: -1 });
    
    if (!settings || !settings.maintenanceMode?.isActive) {
      return res.json({ 
        showMaintenance: false,
        reason: 'Maintenance mode is not active'
      });
    }

    const maintenanceMode = settings.maintenanceMode;
    
    // Check if user is admin or canteen owner (they bypass maintenance)
    if (user.role === 'admin' || user.role === 'canteen_owner' || user.role === 'canteen-owner') {
      return res.json({ 
        showMaintenance: false,
        reason: 'User has admin/canteen owner privileges'
      });
    }

    // Apply targeting logic
    let shouldShowMaintenance = false;
    let reason = '';

    switch (maintenanceMode.targetingType) {
      case 'all':
        shouldShowMaintenance = true;
        reason = 'Maintenance applies to all users';
        break;
        
      case 'specific':
        // Check if user's registerNumber or staffId is in the specific list
        const userIdentifier = user.role === 'student' ? user.registerNumber : user.staffId;
        shouldShowMaintenance = maintenanceMode.specificUsers.includes(userIdentifier || '');
        reason = shouldShowMaintenance 
          ? `User ${userIdentifier} is specifically targeted`
          : `User ${userIdentifier} is not specifically targeted`;
        break;
        
      case 'department':
        shouldShowMaintenance = maintenanceMode.targetDepartments.includes(user.department || '');
        reason = shouldShowMaintenance 
          ? `Department '${user.department}' is targeted`
          : `Department '${user.department}' is not targeted`;
        break;
        
      case 'year':
        let userYear: number | null = null;
        if (maintenanceMode.yearType === 'joining') {
          userYear = user.joiningYear;
        } else if (maintenanceMode.yearType === 'passing') {
          userYear = user.passingOutYear;
        } else if (maintenanceMode.yearType === 'current') {
          userYear = user.currentStudyYear;
        }
        shouldShowMaintenance = userYear ? maintenanceMode.targetYears.includes(userYear) : false;
        reason = shouldShowMaintenance 
          ? `User's ${maintenanceMode.yearType} year (${userYear}) is targeted`
          : `User's ${maintenanceMode.yearType} year (${userYear}) is not targeted`;
        break;
        
      case 'year_department':
        // Both department AND year must match
        const deptMatch = maintenanceMode.targetDepartments.includes(user.department || '');
        let yearMatch = false;
        let yearValue: number | null = null;
        
        if (maintenanceMode.yearType === 'joining') {
          yearValue = user.joiningYear;
        } else if (maintenanceMode.yearType === 'passing') {
          yearValue = user.passingOutYear;
        } else if (maintenanceMode.yearType === 'current') {
          yearValue = user.currentStudyYear;
        }
        
        yearMatch = yearValue ? maintenanceMode.targetYears.includes(yearValue) : false;
        shouldShowMaintenance = deptMatch && yearMatch;
        reason = shouldShowMaintenance 
          ? `Both department '${user.department}' and ${maintenanceMode.yearType} year (${yearValue}) match`
          : `Department match: ${deptMatch}, Year match: ${yearMatch}`;
        break;
        
      default:
        shouldShowMaintenance = false;
        reason = 'Unknown targeting type';
    }

    res.json({
      showMaintenance: shouldShowMaintenance,
      reason,
      maintenanceInfo: shouldShowMaintenance ? {
        title: maintenanceMode.title,
        message: maintenanceMode.message,
        estimatedTime: maintenanceMode.estimatedTime,
        contactInfo: maintenanceMode.contactInfo
      } : null
    });
    
  } catch (error) {
    console.error('Error checking maintenance status for user:', error);
    res.status(500).json({ error: 'Failed to check maintenance status' });
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
          contactInfo: '',
          targetingType: 'all',
          specificUsers: [],
          targetDepartments: [],
          targetYears: [],
          yearType: 'current'
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
        contactInfo: '',
        targetingType: 'all',
        specificUsers: [],
        targetDepartments: [],
        targetYears: [],
        yearType: 'current'
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