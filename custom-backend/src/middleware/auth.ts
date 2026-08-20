import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

// Extend Express Request object to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
      };
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];

    // Verify JWT
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as { userId: string };
    
    // Attach user to request object
    req.user = { userId: decoded.userId };
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};
