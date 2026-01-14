import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../database/connection';

// AuthRequest properly extends Express Request with all its properties
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    restaurantId?: string;
  };
  // Explicitly include Request properties to ensure TypeScript recognizes them
  headers: Request['headers'];
  body: any;
  params: Request['params'];
  query: Request['query'];
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, secret) as {
      userId: string;
      email: string;
      role: string;
    };

    // Get user from database
    const result = await query(
      'SELECT id, email, role FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }

    const user = result.rows[0];

    // Get restaurant_id for restaurant owners and riders
    let restaurantId: string | undefined;
    if (user.role === 'restaurant_owner') {
      const restaurantResult = await query(
        'SELECT id FROM restaurants WHERE owner_id = $1 LIMIT 1',
        [user.id]
      );
      restaurantId = restaurantResult.rows[0]?.id;
    } else if (user.role === 'rider') {
      const riderResult = await query(
        'SELECT restaurant_id FROM riders WHERE user_id = $1 LIMIT 1',
        [user.id]
      );
      restaurantId = riderResult.rows[0]?.restaurant_id;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      restaurantId,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    next(error);
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      return;
    }

    next();
  };
}
