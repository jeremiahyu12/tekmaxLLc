import express, { Response, NextFunction } from 'express';
import { query } from '../database/connection';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = express.Router();

router.use(authenticate);

// Get restaurant settings (Gloria Food, DoorDash)
router.get('/settings', authorize('restaurant_owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Get user's restaurant
    const restaurantResult = await query(
      'SELECT id FROM restaurants WHERE owner_id = $1 LIMIT 1',
      [req.user!.id]
    );

    if (restaurantResult.rows.length === 0) {
      throw new AppError('Restaurant not found', 404);
    }

    const restaurantId = restaurantResult.rows[0].id;

    // Get settings
    const settingsResult = await query(
      'SELECT * FROM restaurant_settings WHERE restaurant_id = $1',
      [restaurantId]
    );

    if (settingsResult.rows.length === 0) {
      // Create default settings
      await query(
        'INSERT INTO restaurant_settings (restaurant_id) VALUES ($1)',
        [restaurantId]
      );
      const newSettings = await query(
        'SELECT * FROM restaurant_settings WHERE restaurant_id = $1',
        [restaurantId]
      );
      return res.json({ settings: newSettings.rows[0] });
    }

    res.json({ settings: settingsResult.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Update restaurant settings (all settings including location, dispatch, notifications, etc.)
router.put('/settings', authorize('restaurant_owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      // Third-party integrations
      gloriaFoodApiKey,
      gloriaFoodStoreId,
      gloriaFoodMasterKey,
      gloriaFoodContactEmail,
      gloriaFoodWebhookUrl,
      doordashDeveloperId,
      doordashKeyId,
      doordashSigningSecret,
      doordashMerchantId,
      doordashSandbox,
      // Location settings
      country,
      city,
      state,
      currency,
      timezone,
      distanceUnit,
      // Dispatch settings
      autoAssignRiders,
      maxDeliveryRadius,
      deliveryFee,
      minimumOrderAmount,
      // Notification settings
      emailNotifications,
      smsNotifications,
      orderStatusNotifications,
      deliveryStatusNotifications,
    } = req.body;

    // Get user's restaurant
    const restaurantResult = await query(
      'SELECT id FROM restaurants WHERE owner_id = $1 LIMIT 1',
      [req.user!.id]
    );

    if (restaurantResult.rows.length === 0) {
      throw new AppError('Restaurant not found', 404);
    }

    const restaurantId = restaurantResult.rows[0].id;

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (gloriaFoodApiKey !== undefined) {
      updates.push(`gloria_food_api_key = $${paramCount++}`);
      params.push(gloriaFoodApiKey);
    }
    if (gloriaFoodStoreId !== undefined) {
      updates.push(`gloria_food_store_id = $${paramCount++}`);
      params.push(gloriaFoodStoreId);
    }
    if (gloriaFoodMasterKey !== undefined) {
      updates.push(`gloria_food_master_key = $${paramCount++}`);
      params.push(gloriaFoodMasterKey);
    }
    if (gloriaFoodContactEmail !== undefined) {
      updates.push(`gloria_food_contact_email = $${paramCount++}`);
      params.push(gloriaFoodContactEmail);
    }
    if (gloriaFoodWebhookUrl !== undefined) {
      updates.push(`gloria_food_webhook_url = $${paramCount++}`);
      params.push(gloriaFoodWebhookUrl);
    }
    if (doordashDeveloperId !== undefined) {
      updates.push(`doordash_developer_id = $${paramCount++}`);
      params.push(doordashDeveloperId);
    }
    if (doordashKeyId !== undefined) {
      updates.push(`doordash_key_id = $${paramCount++}`);
      params.push(doordashKeyId);
    }
    if (doordashSigningSecret !== undefined) {
      updates.push(`doordash_signing_secret = $${paramCount++}`);
      params.push(doordashSigningSecret);
    }
    if (doordashMerchantId !== undefined) {
      updates.push(`doordash_merchant_id = $${paramCount++}`);
      params.push(doordashMerchantId);
    }
    if (doordashSandbox !== undefined) {
      updates.push(`doordash_sandbox = $${paramCount++}`);
      params.push(doordashSandbox);
    }
    // Location settings
    if (country !== undefined) {
      updates.push(`country = $${paramCount++}`);
      params.push(country);
    }
    if (city !== undefined) {
      updates.push(`city = $${paramCount++}`);
      params.push(city);
    }
    if (state !== undefined) {
      updates.push(`state = $${paramCount++}`);
      params.push(state);
    }
    if (currency !== undefined) {
      updates.push(`currency = $${paramCount++}`);
      params.push(currency);
    }
    if (timezone !== undefined) {
      updates.push(`timezone = $${paramCount++}`);
      params.push(timezone);
    }
    if (distanceUnit !== undefined) {
      updates.push(`distance_unit = $${paramCount++}`);
      params.push(distanceUnit);
    }
    // Dispatch settings
    if (autoAssignRiders !== undefined) {
      updates.push(`auto_assign_riders = $${paramCount++}`);
      params.push(autoAssignRiders);
    }
    if (maxDeliveryRadius !== undefined) {
      updates.push(`max_delivery_radius = $${paramCount++}`);
      params.push(maxDeliveryRadius);
    }
    if (deliveryFee !== undefined) {
      updates.push(`delivery_fee = $${paramCount++}`);
      params.push(deliveryFee);
    }
    if (minimumOrderAmount !== undefined) {
      updates.push(`minimum_order_amount = $${paramCount++}`);
      params.push(minimumOrderAmount);
    }
    // Notification settings
    if (emailNotifications !== undefined) {
      updates.push(`email_notifications = $${paramCount++}`);
      params.push(emailNotifications);
    }
    if (smsNotifications !== undefined) {
      updates.push(`sms_notifications = $${paramCount++}`);
      params.push(smsNotifications);
    }
    if (orderStatusNotifications !== undefined) {
      updates.push(`order_status_notifications = $${paramCount++}`);
      params.push(orderStatusNotifications);
    }
    if (deliveryStatusNotifications !== undefined) {
      updates.push(`delivery_status_notifications = $${paramCount++}`);
      params.push(deliveryStatusNotifications);
    }

    // Update connection status
    if (gloriaFoodApiKey && gloriaFoodStoreId && gloriaFoodMasterKey) {
      updates.push(`is_gloria_food_connected = $${paramCount++}`);
      params.push(true);
    }
    if (doordashDeveloperId && doordashKeyId && doordashSigningSecret) {
      updates.push(`is_doordash_connected = $${paramCount++}`);
      params.push(true);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updates.length === 0) {
      throw new AppError('No updates provided', 400);
    }

    params.push(restaurantId);

    await query(
      `UPDATE restaurant_settings 
       SET ${updates.join(', ')}
       WHERE restaurant_id = $${paramCount}`,
      params
    );

    // Get updated settings
    const updatedSettings = await query(
      'SELECT * FROM restaurant_settings WHERE restaurant_id = $1',
      [restaurantId]
    );

    res.json({ settings: updatedSettings.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Get or generate API key for merchant
router.get('/api-key', authorize('restaurant_owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Get user's restaurant
    const restaurantResult = await query(
      'SELECT id FROM restaurants WHERE owner_id = $1 LIMIT 1',
      [req.user!.id]
    );

    if (restaurantResult.rows.length === 0) {
      throw new AppError('Restaurant not found', 404);
    }

    const restaurantId = restaurantResult.rows[0].id;

    // Get settings
    const settingsResult = await query(
      'SELECT * FROM restaurant_settings WHERE restaurant_id = $1',
      [restaurantId]
    );

    let settings = settingsResult.rows[0];

    // If no settings exist, create default
    if (!settings) {
      await query(
        'INSERT INTO restaurant_settings (restaurant_id) VALUES ($1)',
        [restaurantId]
      );
      const newSettings = await query(
        'SELECT * FROM restaurant_settings WHERE restaurant_id = $1',
        [restaurantId]
      );
      settings = newSettings.rows[0];
    }

    // Generate API key if it doesn't exist
    if (!settings.api_key) {
      const apiKey = `tm_${restaurantId.substring(0, 8)}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
      await query(
        'UPDATE restaurant_settings SET api_key = $1, updated_at = CURRENT_TIMESTAMP WHERE restaurant_id = $2',
        [apiKey, restaurantId]
      );
      const updatedSettings = await query(
        'SELECT * FROM restaurant_settings WHERE restaurant_id = $1',
        [restaurantId]
      );
      settings = updatedSettings.rows[0];
    }

    res.json({ 
      apiKey: settings.api_key,
      integrationEmail: settings.integration_email || null,
    });
  } catch (error) {
    next(error);
  }
});

// Generate integration email
router.post('/integration-email', authorize('restaurant_owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Get user's restaurant
    const restaurantResult = await query(
      'SELECT id, slug FROM restaurants WHERE owner_id = $1 LIMIT 1',
      [req.user!.id]
    );

    if (restaurantResult.rows.length === 0) {
      throw new AppError('Restaurant not found', 404);
    }

    const restaurant = restaurantResult.rows[0];
    const restaurantId = restaurant.id;

    // Generate unique email
    const randomId = Math.random().toString(36).substring(2, 10);
    const integrationEmail = `integration-${restaurant.slug || restaurantId.substring(0, 8)}-${randomId}@tekmax.com`;

    // Update settings
    await query(
      'UPDATE restaurant_settings SET integration_email = $1, updated_at = CURRENT_TIMESTAMP WHERE restaurant_id = $2',
      [integrationEmail, restaurantId]
    );

    res.json({ integrationEmail });
  } catch (error) {
    next(error);
  }
});

// Get or generate Gloria Food API key for connection
router.get('/gloria-food/api-key', authorize('restaurant_owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Always return webhook URL (it's static, doesn't depend on database)
    const webhookUrl = `${process.env.API_URL || 'http://localhost:3000'}/api/webhooks/gloria-food`;
    
    // Try to get restaurant and webhook config, but don't fail if it doesn't exist
    try {
      // Get user's restaurant
      const restaurantResult = await query(
        'SELECT id FROM restaurants WHERE owner_id = $1 LIMIT 1',
        [req.user!.id]
      );

      if (restaurantResult.rows.length === 0) {
        // Restaurant not found, but still return webhook URL
        return res.json({ 
          apiKey: null,
          webhookUrl: webhookUrl,
          message: 'Restaurant not found. Please create a restaurant first.'
        });
      }

      const restaurantId = restaurantResult.rows[0].id;

      // Get or create webhook config for Gloria Food
      let webhookConfig = await query(
        `SELECT * FROM webhook_configs 
         WHERE restaurant_id = $1 AND platform = 'gloria_food'`,
        [restaurantId]
      );

      if (webhookConfig.rows.length === 0) {
        // Generate API key for Gloria Food connection
        const apiKey = `gf_${restaurantId.substring(0, 8)}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
        const apiSecret = `gf_secret_${Math.random().toString(36).substring(2, 15)}`;
        
        try {
          const createResult = await query(
            `INSERT INTO webhook_configs (restaurant_id, platform, api_key, api_secret, is_active)
             VALUES ($1, 'gloria_food', $2, $3, true)
             RETURNING *`,
            [restaurantId, apiKey, apiSecret]
          );
          
          webhookConfig = createResult;
        } catch (insertError: any) {
          // If insert fails, still return the API key and URL
          console.warn('Failed to insert webhook config:', insertError.message);
          return res.json({ 
            apiKey: apiKey,
            webhookUrl: webhookUrl,
          });
        }
      }

      return res.json({ 
        apiKey: webhookConfig.rows[0]?.api_key || null,
        webhookUrl: webhookUrl,
      });
    } catch (dbError: any) {
      // Database error, but still return webhook URL
      console.warn('Database error in /gloria-food/api-key:', dbError.message);
      return res.json({ 
        apiKey: null,
        webhookUrl: webhookUrl,
        error: 'Could not load API key, but webhook URL is available.'
      });
    }
  } catch (error) {
    console.error('Error in /gloria-food/api-key:', error);
    // Even on error, return the webhook URL
    const webhookUrl = `${process.env.API_URL || 'http://localhost:3000'}/api/webhooks/gloria-food`;
    return res.json({ 
      apiKey: null,
      webhookUrl: webhookUrl,
      error: 'An error occurred, but webhook URL is available.'
    });
  }
});

// Get webhook config for Gloria Food
router.get('/gloria-food/webhook-config', authorize('restaurant_owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Get user's restaurant
    const restaurantResult = await query(
      'SELECT id FROM restaurants WHERE owner_id = $1 LIMIT 1',
      [req.user!.id]
    );

    if (restaurantResult.rows.length === 0) {
      throw new AppError('Restaurant not found', 404);
    }

    const restaurantId = restaurantResult.rows[0].id;

    // Get or create webhook config
    let webhookConfig = await query(
      `SELECT * FROM webhook_configs 
       WHERE restaurant_id = $1 AND platform = 'gloria_food'`,
      [restaurantId]
    );

    if (webhookConfig.rows.length === 0) {
      // Create webhook config
      const apiKey = `gf_${restaurantId.substring(0, 8)}_${Date.now()}`;
      const apiSecret = `gf_secret_${Math.random().toString(36).substring(2, 15)}`;
      
      const createResult = await query(
        `INSERT INTO webhook_configs (restaurant_id, platform, api_key, api_secret, is_active)
         VALUES ($1, 'gloria_food', $2, $3, true)
         RETURNING *`,
        [restaurantId, apiKey, apiSecret]
      );
      
      webhookConfig = createResult;
    }

    res.json({ 
      webhookConfig: webhookConfig.rows[0],
      webhookUrl: `${process.env.API_URL || 'http://localhost:3000'}/api/webhooks/gloria-food`,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
