import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { query } from '../database/connection';
import { authRateLimiter } from '../middleware/rateLimiter';
import { AppError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Register
router.post('/register', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName, phone, role } = req.body;

    if (!email || !password || !firstName || !lastName || !role) {
      throw new AppError('Missing required fields', 400);
    }

    if (!['restaurant_owner', 'rider', 'agency_partner'].includes(role)) {
      throw new AppError('Invalid role', 400);
    }

    // Check if user exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      throw new AppError('User already exists', 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, role, first_name, last_name`,
      [email, passwordHash, role, firstName, lastName, phone || null]
    );

    const user = result.rows[0];

    // Generate token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new AppError('JWT_SECRET not configured', 500);
    }
    const options: SignOptions = { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as SignOptions;
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      secret,
      options
    );

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
      },
      token,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    console.error('Error stack:', error.stack);
    next(error);
  }
});

// Login
router.post('/login', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password required', 400);
    }

    // Find user
    const result = await query(
      'SELECT id, email, password_hash, role, first_name, last_name, is_active FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw new AppError('Invalid credentials', 401);
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw new AppError('Account is inactive', 403);
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new AppError('Invalid credentials', 401);
    }

    // Generate token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new AppError('JWT_SECRET not configured', 500);
    }
    const options: SignOptions = { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as SignOptions;
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      secret,
      options
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      'SELECT id, email, role, first_name, last_name, phone FROM users WHERE id = $1',
      [req.user!.id]
    );

    if (result.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.patch('/profile', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, email, phone } = req.body;

    if (!firstName || !lastName || !email) {
      throw new AppError('First name, last name, and email are required', 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('Invalid email format', 400);
    }

    // Check if email is already taken by another user
    const emailCheck = await query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, req.user!.id]
    );

    if (emailCheck.rows.length > 0) {
      throw new AppError('Email is already taken', 409);
    }

    // Update user
    const result = await query(
      `UPDATE users 
       SET first_name = $1, last_name = $2, email = $3, phone = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, email, role, first_name, last_name, phone`,
      [firstName, lastName, email, phone || null, req.user!.id]
    );

    if (result.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    res.json({
      user: result.rows[0],
      message: 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

async function ensureUserProfileDetailsTable(): Promise<void> {
  // Safe to call multiple times
  await query(
    `CREATE TABLE IF NOT EXISTS user_profile_details (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      company_name VARCHAR(255),
      billing_email VARCHAR(255),
      billing_address TEXT,
      contact_name VARCHAR(255),
      contact_phone VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  );
  await query('CREATE INDEX IF NOT EXISTS idx_user_profile_details_user_id ON user_profile_details(user_id)');
}

// Get billing/contact profile details
router.get('/profile-details', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    try {
      await ensureUserProfileDetailsTable();
    } catch (e) {
      // If running on mock DB or lacking privileges, ignore and continue
    }

    const result = await query(
      `SELECT company_name, billing_email, billing_address, contact_name, contact_phone
       FROM user_profile_details
       WHERE user_id = $1`,
      [req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.json({
        company_name: null,
        billing_email: null,
        billing_address: null,
        contact_name: null,
        contact_phone: null,
      });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update billing/contact profile details
router.patch('/profile-details', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { company_name, billing_email, billing_address, contact_name, contact_phone } = req.body;

    try {
      await ensureUserProfileDetailsTable();
    } catch (e) {
      // ignore (mock DB)
    }

    const result = await query(
      `INSERT INTO user_profile_details (user_id, company_name, billing_email, billing_address, contact_name, contact_phone, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id)
       DO UPDATE SET
         company_name = COALESCE(EXCLUDED.company_name, user_profile_details.company_name),
         billing_email = COALESCE(EXCLUDED.billing_email, user_profile_details.billing_email),
         billing_address = COALESCE(EXCLUDED.billing_address, user_profile_details.billing_address),
         contact_name = COALESCE(EXCLUDED.contact_name, user_profile_details.contact_name),
         contact_phone = COALESCE(EXCLUDED.contact_phone, user_profile_details.contact_phone),
         updated_at = CURRENT_TIMESTAMP
       RETURNING company_name, billing_email, billing_address, contact_name, contact_phone`,
      [
        req.user!.id,
        company_name ?? null,
        billing_email ?? null,
        billing_address ?? null,
        contact_name ?? null,
        contact_phone ?? null,
      ]
    );

    return res.json({
      ...result.rows[0],
      message: 'Profile details updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Change password
router.patch('/change-password', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('Current password and new password are required', 400);
    }

    if (newPassword.length < 8) {
      throw new AppError('New password must be at least 8 characters long', 400);
    }

    // Get user with password hash
    const userResult = await query(
      'SELECT id, password_hash FROM users WHERE id = $1',
      [req.user!.id]
    );

    if (userResult.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    const user = userResult.rows[0];

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      throw new AppError('Current password is incorrect', 401);
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, req.user!.id]
    );

    res.json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
