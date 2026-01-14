import express, { Response, NextFunction } from 'express';
import { query } from '../database/connection';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = express.Router();

router.use(authenticate);

// Create restaurant
router.post('/', authorize('restaurant_owner', 'admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      slug,
      description,
      phone,
      email,
      address,
      latitude,
      longitude,
      agencyPartnerId, // Optional: link to agency partner
    } = req.body;

    if (!name || !slug || !address) {
      throw new AppError('Missing required fields', 400);
    }

    const ownerId = req.user!.role === 'admin' ? req.body.ownerId || req.user!.id : req.user!.id;

    // If agencyPartnerId is provided, verify it's a valid agency_partner
    let agencyPartnerIdToUse: string | null = null;
    if (agencyPartnerId) {
      const agencyCheck = await query(
        'SELECT id FROM users WHERE id = $1 AND role = $2',
        [agencyPartnerId, 'agency_partner']
      );
      if (agencyCheck.rows.length === 0) {
        throw new AppError('Invalid agency partner', 400);
      }
      agencyPartnerIdToUse = agencyPartnerId;
    } else if (req.user!.role === 'agency_partner') {
      // If registering as agency partner, link to themselves
      agencyPartnerIdToUse = req.user!.id || null;
    }

    const result = await query(
      `INSERT INTO restaurants (
        owner_id, name, slug, description, phone, email,
        address_line1, address_line2, city, state, postal_code, country,
        latitude, longitude, agency_partner_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        ownerId,
        name,
        slug,
        description || null,
        phone || null,
        email || null,
        address.line1,
        address.line2 || null,
        address.city,
        address.state || null,
        address.postalCode || null,
        address.country || 'US',
        latitude || null,
        longitude || null,
        agencyPartnerIdToUse,
      ]
    );

    const restaurant = result.rows[0];

    // Create default restaurant settings
    await query(
      `INSERT INTO restaurant_settings (restaurant_id)
       VALUES ($1)
       ON CONFLICT (restaurant_id) DO NOTHING`,
      [restaurant.id]
    );

    res.status(201).json({ restaurant });
  } catch (error) {
    next(error);
  }
});

// Get restaurants
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let restaurants;

    if (req.user!.role === 'admin') {
      restaurants = await query(
        `SELECT r.*, u.first_name || ' ' || u.last_name as owner_name
         FROM restaurants r
         JOIN users u ON r.owner_id = u.id
         ORDER BY r.created_at DESC`
      );
    } else if (req.user!.role === 'restaurant_owner') {
      restaurants = await query(
        'SELECT * FROM restaurants WHERE owner_id = $1 ORDER BY created_at DESC',
        [req.user!.id]
      );
    } else if (req.user!.role === 'agency_partner') {
      // Agency partners see restaurants linked to them
      restaurants = await query(
        `SELECT r.*, u.first_name || ' ' || u.last_name as owner_name
         FROM restaurants r
         JOIN users u ON r.owner_id = u.id
         WHERE r.agency_partner_id = $1
         ORDER BY r.created_at DESC`,
        [req.user!.id]
      );
    } else {
      throw new AppError('Unauthorized', 403);
    }

    res.json({ restaurants: restaurants.rows });
  } catch (error) {
    next(error);
  }
});

// Get single restaurant
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await query('SELECT * FROM restaurants WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      throw new AppError('Restaurant not found', 404);
    }

    const restaurant = result.rows[0];

    // Verify access
    if (req.user!.role !== 'admin' && restaurant.owner_id !== req.user!.id) {
      throw new AppError('Access denied', 403);
    }

    res.json({ restaurant });
  } catch (error) {
    next(error);
  }
});

// Get current user's restaurant
router.get('/me/restaurant', authorize('restaurant_owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      'SELECT * FROM restaurants WHERE owner_id = $1 LIMIT 1',
      [req.user!.id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Restaurant not found', 404);
    }

    res.json({ restaurant: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Update restaurant
router.put('/:id', authorize('restaurant_owner', 'admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      description,
      phone,
      email,
      address,
      latitude,
      longitude,
    } = req.body;

    // Get restaurant
    const restaurantResult = await query('SELECT * FROM restaurants WHERE id = $1', [req.params.id]);

    if (restaurantResult.rows.length === 0) {
      throw new AppError('Restaurant not found', 404);
    }

    const restaurant = restaurantResult.rows[0];

    // Verify access
    if (req.user!.role !== 'admin' && restaurant.owner_id !== req.user!.id) {
      throw new AppError('Access denied', 403);
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      params.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      params.push(description);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      params.push(phone);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      params.push(email);
    }
    if (address?.line1 !== undefined) {
      updates.push(`address_line1 = $${paramCount++}`);
      params.push(address.line1);
    }
    if (address?.line2 !== undefined) {
      updates.push(`address_line2 = $${paramCount++}`);
      params.push(address.line2);
    }
    if (address?.city !== undefined) {
      updates.push(`city = $${paramCount++}`);
      params.push(address.city);
    }
    if (address?.state !== undefined) {
      updates.push(`state = $${paramCount++}`);
      params.push(address.state);
    }
    if (address?.postalCode !== undefined) {
      updates.push(`postal_code = $${paramCount++}`);
      params.push(address.postalCode);
    }
    if (address?.country !== undefined) {
      updates.push(`country = $${paramCount++}`);
      params.push(address.country);
    }
    if (latitude !== undefined) {
      updates.push(`latitude = $${paramCount++}`);
      params.push(latitude);
    }
    if (longitude !== undefined) {
      updates.push(`longitude = $${paramCount++}`);
      params.push(longitude);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updates.length === 0) {
      throw new AppError('No updates provided', 400);
    }

    params.push(req.params.id);

    const result = await query(
      `UPDATE restaurants 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      params
    );

    res.json({ restaurant: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
